import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  text,
  json,
  writer,
} from '@nozbe/watermelondb/decorators';

export interface PollOption {
  optionId: string;
  text: string;
  image?: string;
  votes: number;
  voters: string[];
}

export interface PollSettings {
  allowMultipleChoices: boolean;
  requiresAuthentication: boolean;
  showResultsBeforeVoting: boolean;
  allowAddOptions: boolean;
  isAnonymous: boolean;
}

export interface PollDemographics {
  experienceLevels: Record<string, number>;
  growingMethods: Record<string, number>;
  locations: Record<string, number>;
}

export interface VotingTrend {
  timestamp: Date;
  optionId: string;
  voteCount: number;
}

export interface PollResults {
  totalVotes: number;
  participantCount: number;
  demographics: PollDemographics;
  trends: VotingTrend[];
}

/**
 * Default poll results structure
 */
const DEFAULT_POLL_RESULTS: PollResults = {
  totalVotes: 0,
  participantCount: 0,
  demographics: {
    experienceLevels: {},
    growingMethods: {},
    locations: {}
  },
  trends: []
};

/**
 * CommunityPoll model for live polling
 */
export class CommunityPoll extends Model {
  static table = 'community_polls';

  @text('question') question!: string;
  @text('description') description?: string;
  @json('options', (json) => json) options!: PollOption[];
  @json('settings', (json) => json) settings!: PollSettings;
  @text('created_by') createdBy!: string;
  @date('ends_at') endsAt?: Date;
  @text('status') status!: string; // 'active' | 'ended' | 'cancelled'
  @json('results', (json) => json) results!: PollResults;
  @field('is_deleted') isDeleted?: boolean;
  @date('last_synced_at') lastSyncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties
  get isActive(): boolean {
    return this.status === 'active';
  }

  get hasEnded(): boolean {
    return this.status === 'ended';
  }

  get isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  get isExpired(): boolean {
    return this.endsAt ? new Date() > this.endsAt : false;
  }

  get totalVotes(): number {
    return this.results?.totalVotes || 0;
  }

  get participantCount(): number {
    return this.results?.participantCount || 0;
  }

  get optionCount(): number {
    return this.options?.length || 0;
  }

  get allowsMultipleChoices(): boolean {
    return this.settings?.allowMultipleChoices || false;
  }

  get isAnonymous(): boolean {
    return this.settings?.isAnonymous || false;
  }

  get minutesRemaining(): number {
    if (!this.endsAt || this.hasEnded) return 0;
    const now = new Date();
    const timeDiff = this.endsAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(timeDiff / (1000 * 60)));
  }

  get hoursRemaining(): number {
    return Math.floor(this.minutesRemaining / 60);
  }

  // Writer methods
  @writer async updateQuestion(question: string) {
    await this.update((poll) => {
      poll.question = question;
    });
  }

  @writer async updateDescription(description: string) {
    await this.update((poll) => {
      poll.description = description;
    });
  }

  @writer async addOption(option: Omit<PollOption, 'votes' | 'voters'>) {
    await this.update((poll) => {
      const currentOptions = poll.options || [];
      const newOption: PollOption = {
        ...option,
        votes: 0,
        voters: []
      };
      poll.options = [...currentOptions, newOption];
    });
  }

  @writer async removeOption(optionId: string) {
    await this.update((poll) => {
      const currentOptions = poll.options || [];
      poll.options = currentOptions.filter(option => option.optionId !== optionId);
    });
  }

  @writer async updateOption(optionId: string, updates: Partial<PollOption>) {
    await this.update((poll) => {
      const currentOptions = poll.options || [];
      poll.options = currentOptions.map(option => 
        option.optionId === optionId 
          ? { ...option, ...updates }
          : option
      );
    });
  }

  @writer async vote(userId: string, optionIds: string[]) {
    await this.update((poll) => {
      const currentOptions = poll.options || [];
      const currentResults = poll.results || DEFAULT_POLL_RESULTS;
      const isAnonymous = poll.settings?.isAnonymous;

      if (isAnonymous) {
        // Anonymous: Only update vote counts, do not store voter IDs
        // Remove all voter IDs for this user (if any) if not allowing multiple choices
        if (!poll.settings?.allowMultipleChoices) {
          // No-op: we do not track voter IDs, so nothing to remove
        }
        // Add new votes: increment vote count for each selected option
        optionIds.forEach(optionId => {
          const option = currentOptions.find(opt => opt.optionId === optionId);
          if (option) {
            option.votes = (option.votes || 0) + 1;
          }
        });
        // Update results
        const totalVotes = currentOptions.reduce((sum, option) => sum + (option.votes || 0), 0);
        // For anonymous polls, participantCount is not tracked by userId, so just increment by 1 per vote call
        const participantCount = (currentResults.participantCount || 0) + 1;
        // Remove all voter IDs for privacy
        currentOptions.forEach(option => { option.voters = []; });
        poll.options = currentOptions;
        poll.results = {
          ...currentResults,
          totalVotes,
          participantCount
        };
      } else {
        // Not anonymous: track voter IDs as before
        // Remove previous votes from this user if not allowing multiple choices
        if (!poll.settings?.allowMultipleChoices) {
          currentOptions.forEach(option => {
            option.voters = option.voters.filter(voterId => voterId !== userId);
          });
        }
        // Add new votes
        optionIds.forEach(optionId => {
          const option = currentOptions.find(opt => opt.optionId === optionId);
          if (option && !option.voters.includes(userId)) {
            option.voters.push(userId);
            option.votes = option.voters.length;
          }
        });
        // Update results
        const totalVotes = currentOptions.reduce((sum, option) => sum + option.votes, 0);
        const participantCount = new Set(currentOptions.flatMap(option => option.voters)).size;
        poll.options = currentOptions;
        poll.results = {
          ...currentResults,
          totalVotes,
          participantCount
        };
      }
    });
  }

  @writer async removeVote(userId: string) {
    await this.update((poll) => {
      const currentOptions = poll.options || [];
      const currentResults = poll.results || DEFAULT_POLL_RESULTS;

      // Remove user's votes from all options
      currentOptions.forEach(option => {
        option.voters = option.voters.filter(voterId => voterId !== userId);
        option.votes = option.voters.length;
      });

      // Update results
      const totalVotes = currentOptions.reduce((sum, option) => sum + option.votes, 0);
      const participantCount = new Set(currentOptions.flatMap(option => option.voters)).size;

      poll.options = currentOptions;
      poll.results = {
        ...currentResults,
        totalVotes,
        participantCount
      };
    });
  }

  @writer async updateSettings(newSettings: Partial<PollSettings>) {
    await this.update((poll) => {
      poll.settings = { ...poll.settings, ...newSettings };
    });
  }

  @writer async setEndTime(endsAt: Date) {
    await this.update((poll) => {
      poll.endsAt = endsAt;
    });
  }

  @writer async extendDeadline(additionalMinutes: number) {
    if (
      typeof additionalMinutes !== 'number' ||
      !Number.isFinite(additionalMinutes) ||
      additionalMinutes < 1 ||
      additionalMinutes > 1440
    ) {
      throw new Error('additionalMinutes must be a positive number between 1 and 1440.');
    }
    await this.update((poll) => {
      const currentEndTime = poll.endsAt || new Date();
      poll.endsAt = new Date(currentEndTime.getTime() + (additionalMinutes * 60 * 1000));
    });
  }

  @writer async endPoll() {
    await this.update((poll) => {
      poll.status = 'ended';
    });
  }

  @writer async cancelPoll() {
    await this.update((poll) => {
      poll.status = 'cancelled';
    });
  }

  @writer async reactivatePoll() {
    await this.update((poll) => {
      poll.status = 'active';
    });
  }

  @writer async updateResults(newResults: Partial<PollResults>) {
    await this.update((poll) => {
      poll.results = { ...poll.results, ...newResults };
    });
  }

  @writer async addVotingTrend(optionId: string, voteCount: number) {
    await this.update((poll) => {
      const currentResults = poll.results || DEFAULT_POLL_RESULTS;
      const newTrend: VotingTrend = {
        timestamp: new Date(),
        optionId,
        voteCount
      };
      
      poll.results = {
        ...currentResults,
        trends: [...(currentResults.trends || []), newTrend]
      };
    });
  }

  @writer async markAsDeleted() {
    await this.update((poll) => {
      poll.isDeleted = true;
      if (poll.status === 'active') {
        poll.status = 'cancelled';
      }
    });
  }
}