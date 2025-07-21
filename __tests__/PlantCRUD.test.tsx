import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import database from '../lib/database/database';
import { Plant } from '../lib/models/Plant';
import { PlantPhoto } from '../lib/models/PlantPhoto';
import { PlantMetrics } from '../lib/models/PlantMetrics';
import { CareReminder } from '../lib/models/CareReminder';
import { AddPlantForm } from '../components/AddPlantForm';
import { PlantList } from '../components/PlantList';
import { GrowthStage, CannabisType, GrowMedium, LightCondition } from '../lib/types/plant';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../lib/contexts/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    isAuthenticated: true,
  }),
}));

jest.mock('../lib/contexts/DatabaseProvider', () => ({
  useDatabase: () => ({
    database: database,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

jest.mock('../lib/utils/haptics', () => ({
  triggerLightHaptic: jest.fn(),
  triggerMediumHaptic: jest.fn(),
  triggerHeavyHaptic: jest.fn(),
  triggerLightHapticSync: jest.fn(),
  triggerErrorHaptic: jest.fn(),
}));

jest.mock('../lib/utils/image-picker', () => ({
  takePhoto: jest.fn().mockResolvedValue({
    uri: 'file://test-photo.jpg',
    width: 1000,
    height: 1000,
  }),
  selectFromGallery: jest.fn().mockResolvedValue({
    uri: 'file://test-gallery.jpg',
    width: 800,
    height: 600,
  }),
}));

jest.mock('../lib/utils/upload-image', () => ({
  uploadPlantGalleryImage: jest.fn().mockResolvedValue({
    publicUrl: 'https://example.com/uploaded-image.jpg',
    path: 'plants/test-image.jpg',
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Plant CRUD Operations with New Features', () => {
  let testPlant: Plant;
  let testPhoto: PlantPhoto;
  let testMetrics: PlantMetrics;
  let testReminder: CareReminder;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset database state
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (testPlant) {
      try {
        await database.write(async () => {
          await testPlant.markAsDeleted();
        });
      } catch (error) {
        // Plant might already be deleted
      }
    }
  });

  describe('Plant Creation with New Metric Fields', () => {
    it('should create a plant with all new metric fields', async () => {
      await database.write(async () => {
        testPlant = await database.get<Plant>('plants').create((plant) => {
          // Basic fields
          plant.journalId = 'test-journal-id';
          plant.name = 'Test Plant';
          plant.strain = 'Test Strain';
          plant.plantedDate = '2025-01-01';
          plant.growthStage = GrowthStage.VEGETATIVE;
          plant.userId = 'test-user-id';
          
          // New plant status fields
          plant.healthPercentage = 85;
          plant.nextWateringDays = 2;
          plant.nextNutrientDays = 5;
          
          // Additional metrics fields
          plant.nodeCount = 8;
          plant.stemDiameter = 1.5;
          plant.phLevel = 6.2;
          plant.ecPpm = 1200;
          plant.temperature = 24;
          plant.humidity = 60;
          plant.vpd = 1.1;
          plant.trichomeStatus = 'cloudy';
          plant.pistilBrownPercentage = 30;
          plant.budDensity = 7;
          
          // Cannabis type and growing details
          plant.cannabisType = CannabisType.INDICA;
          plant.growMedium = GrowMedium.SOIL;
          plant.lightCondition = LightCondition.LED;
          plant.locationDescription = 'Indoor Grow Tent';
          plant.isAutoFlower = false;
          plant.isFeminized = true;
          plant.thcContent = 22.5;
          plant.cbdContent = 1.2;
        });
      });

      expect(testPlant).toBeDefined();
      expect(testPlant.name).toBe('Test Plant');
      expect(testPlant.healthPercentage).toBe(85);
      expect(testPlant.nextWateringDays).toBe(2);
      expect(testPlant.nextNutrientDays).toBe(5);
      expect(testPlant.nodeCount).toBe(8);
      expect(testPlant.stemDiameter).toBe(1.5);
      expect(testPlant.phLevel).toBe(6.2);
      expect(testPlant.ecPpm).toBe(1200);
      expect(testPlant.temperature).toBe(24);
      expect(testPlant.humidity).toBe(60);
      expect(testPlant.vpd).toBe(1.1);
      expect(testPlant.trichomeStatus).toBe('cloudy');
      expect(testPlant.pistilBrownPercentage).toBe(30);
      expect(testPlant.budDensity).toBe(7);
      expect(testPlant.cannabisType).toBe(CannabisType.INDICA);
      expect(testPlant.growMedium).toBe(GrowMedium.SOIL);
      expect(testPlant.lightCondition).toBe(LightCondition.LED);
      expect(testPlant.isAutoFlower).toBe(false);
      expect(testPlant.isFeminized).toBe(true);
      expect(testPlant.thcContent).toBe(22.5);
      expect(testPlant.cbdContent).toBe(1.2);
    });

    it('should create associated photos and metrics', async () => {
      // First create the plant
      await database.write(async () => {
        testPlant = await database.get<Plant>('plants').create((plant) => {
          plant.journalId = 'test-journal-id';
          plant.name = 'Test Plant with Media';
          plant.strain = 'Test Strain';
          plant.plantedDate = '2025-01-01';
          plant.growthStage = GrowthStage.VEGETATIVE;
          plant.userId = 'test-user-id';
          plant.imageUrl = 'https://example.com/plant-image.jpg';
        });
      });

      // Create associated photo
      await database.write(async () => {
        testPhoto = await database.get<PlantPhoto>('plant_photos').create((photo) => {
          photo.plantId = testPlant.id;
          photo.imageUrl = 'https://example.com/plant-photo.jpg';
          photo.thumbnailUrl = 'https://example.com/plant-thumb.jpg';
          photo.caption = 'Week 4 growth';
          photo.growthStage = GrowthStage.VEGETATIVE;
          photo.fileSize = 1024000;
          photo.width = 1920;
          photo.height = 1080;
          photo.takenAt = new Date();
        });
      });

      // Create associated metrics
      await database.write(async () => {
        testMetrics = await database.get<PlantMetrics>('plant_metrics').create((metrics) => {
          metrics.plantId = testPlant.id;
          metrics.healthPercentage = 90;
          metrics.nextWateringDays = 1;
          metrics.nextNutrientDays = 3;
          metrics.height = 45;
          metrics.heightUnit = 'cm';
          metrics.nodeCount = 12;
          metrics.stemDiameter = 2.1;
          metrics.phLevel = 6.5;
          metrics.ecPpm = 1400;
          metrics.temperature = 26;
          metrics.temperatureUnit = 'celsius';
          metrics.humidity = 55;
          metrics.vpd = 1.2;
          metrics.trichomeStatus = 'clear';
          metrics.pistilBrownPercentage = 10;
          metrics.budDensity = 8;
          metrics.notes = 'Looking healthy, good growth rate';
          metrics.recordedAt = new Date();
        });
      });

      expect(testPhoto).toBeDefined();
      expect(testPhoto.plantId).toBe(testPlant.id);
      expect(testPhoto.caption).toBe('Week 4 growth');
      expect(testPhoto.formattedFileSize).toBe('1000 KB');
      expect(testPhoto.aspectRatio).toBeCloseTo(1.78, 2);

      expect(testMetrics).toBeDefined();
      expect(testMetrics.plantId).toBe(testPlant.id);
      expect(testMetrics.isHealthy).toBe(true);
      expect(testMetrics.needsWatering).toBe(false);
      expect(testMetrics.needsNutrients).toBe(false);
      expect(testMetrics.isInOptimalVPD).toBe(true);
      expect(testMetrics.formattedHeight).toBe('45 cm');
      expect(testMetrics.formattedTemperature).toBe('26°C');
    });
  });

  describe('Plant Editing and Updates', () => {
    beforeEach(async () => {
      // Create a test plant for editing
      await database.write(async () => {
        testPlant = await database.get<Plant>('plants').create((plant) => {
          plant.journalId = 'test-journal-id';
          plant.name = 'Original Plant Name';
          plant.strain = 'Original Strain';
          plant.plantedDate = '2025-01-01';
          plant.growthStage = GrowthStage.SEEDLING;
          plant.userId = 'test-user-id';
          plant.healthPercentage = 70;
          plant.nextWateringDays = 3;
          plant.nextNutrientDays = 7;
        });
      });
    });

    it('should update plant with new metric values', async () => {
      await database.write(async () => {
        await testPlant.update((plant) => {
          plant.name = 'Updated Plant Name';
          plant.growthStage = GrowthStage.VEGETATIVE;
          plant.healthPercentage = 95;
          plant.nextWateringDays = 1;
          plant.nextNutrientDays = 4;
          plant.nodeCount = 15;
          plant.stemDiameter = 2.5;
          plant.height = 60;
        });
      });

      // Reload the plant to verify updates
      await testPlant.reload();

      expect(testPlant.name).toBe('Updated Plant Name');
      expect(testPlant.growthStage).toBe(GrowthStage.VEGETATIVE);
      expect(testPlant.healthPercentage).toBe(95);
      expect(testPlant.nextWateringDays).toBe(1);
      expect(testPlant.nextNutrientDays).toBe(4);
      expect(testPlant.nodeCount).toBe(15);
      expect(testPlant.stemDiameter).toBe(2.5);
      expect(testPlant.height).toBe(60);
    });

    it('should update growth stage using helper method', async () => {
      await testPlant.updateGrowthStage(GrowthStage.FLOWERING);
      await testPlant.reload();

      expect(testPlant.growthStage).toBe(GrowthStage.FLOWERING);
    });

    it('should update height using helper method', async () => {
      await testPlant.updateHeight(75);
      await testPlant.reload();

      expect(testPlant.height).toBe(75);
    });

    it('should update notes using helper method', async () => {
      const newNotes = 'Updated plant notes with new observations';
      await testPlant.updateNotes(newNotes);
      await testPlant.reload();

      expect(testPlant.notes).toBe(newNotes);
    });

    it('should update image URL', async () => {
      const newImageUrl = 'https://example.com/new-plant-image.jpg';
      await testPlant.updateImage(newImageUrl);
      await testPlant.reload();

      expect(testPlant.imageUrl).toBe(newImageUrl);
    });
  });

  describe('Plant Deletion with Associated Data', () => {
    beforeEach(async () => {
      // Create plant with associated data
      await database.write(async () => {
        testPlant = await database.get<Plant>('plants').create((plant) => {
          plant.journalId = 'test-journal-id';
          plant.name = 'Plant to Delete';
          plant.strain = 'Test Strain';
          plant.plantedDate = '2025-01-01';
          plant.growthStage = GrowthStage.VEGETATIVE;
          plant.userId = 'test-user-id';
        });

        // Create associated photo
        testPhoto = await database.get<PlantPhoto>('plant_photos').create((photo) => {
          photo.plantId = testPlant.id;
          photo.imageUrl = 'https://example.com/photo-to-delete.jpg';
          photo.growthStage = GrowthStage.VEGETATIVE;
          photo.takenAt = new Date();
        });

        // Create associated metrics
        testMetrics = await database.get<PlantMetrics>('plant_metrics').create((metrics) => {
          metrics.plantId = testPlant.id;
          metrics.healthPercentage = 80;
          metrics.recordedAt = new Date();
        });

        // Create associated reminder
        testReminder = await database.get<CareReminder>('care_reminders').create((reminder) => {
          reminder.plantId = testPlant.id;
          reminder.type = 'watering';
          reminder.title = 'Water the plant';
          reminder.scheduledFor = new Date();
          reminder.isCompleted = false;
        });
      });
    });

    it('should soft delete plant and associated data', async () => {
      // Mark plant as deleted
      await testPlant.markAsDeleted();
      await testPlant.reload();

      expect(testPlant.isDeleted).toBe(true);
      expect(testPlant.isActive).toBe(false);

      // Mark associated data as deleted
      await database.write(async () => {
        await testPhoto.update((photo) => {
          photo.isDeleted = true;
        });
        await testMetrics.update((metrics) => {
          metrics.isDeleted = true;
        });
        await testReminder.markAsDeleted();
      });

      await testPhoto.reload();
      await testMetrics.reload();
      await testReminder.reload();

      expect(testPhoto.isDeleted).toBe(true);
      expect(testMetrics.isDeleted).toBe(true);
      expect(testReminder.isDeleted).toBe(true);
      expect(testReminder.isActive).toBe(false);
    });

    it('should verify plant is excluded from active queries after deletion', async () => {
      // Mark as deleted
      await testPlant.markAsDeleted();

      // Query for active plants
      const activePlants = await database
        .get<Plant>('plants')
        .query()
        .fetch();

      const activeCount = activePlants.filter(p => !p.isDeleted).length;
      expect(activeCount).toBe(0);
    });
  });

  describe('Data Persistence Across App Restarts', () => {
    it('should persist plant data after database operations', async () => {
      // Create plant with comprehensive data
      await database.write(async () => {
        testPlant = await database.get<Plant>('plants').create((plant) => {
          plant.journalId = 'persistence-test-journal';
          plant.name = 'Persistence Test Plant';
          plant.strain = 'Persistence Strain';
          plant.plantedDate = '2025-01-01';
          plant.growthStage = GrowthStage.FLOWERING;
          plant.userId = 'test-user-id';
          plant.healthPercentage = 88;
          plant.nextWateringDays = 2;
          plant.nextNutrientDays = 6;
          plant.nodeCount = 20;
          plant.stemDiameter = 3.2;
          plant.phLevel = 6.8;
          plant.ecPpm = 1600;
          plant.temperature = 22;
          plant.humidity = 45;
          plant.vpd = 1.4;
          plant.cannabisType = CannabisType.SATIVA;
          plant.growMedium = GrowMedium.HYDROPONIC;
          plant.lightCondition = LightCondition.HPS;
          plant.locationDescription = 'Hydroponic Setup Room 2';
          plant.notes = 'Excellent trichome development';
        });
      });

      const plantId = testPlant.id;

      // Simulate app restart by fetching fresh instance
      const persistedPlant = await database.get<Plant>('plants').find(plantId);

      expect(persistedPlant).toBeDefined();
      expect(persistedPlant.name).toBe('Persistence Test Plant');
      expect(persistedPlant.strain).toBe('Persistence Strain');
      expect(persistedPlant.growthStage).toBe(GrowthStage.FLOWERING);
      expect(persistedPlant.healthPercentage).toBe(88);
      expect(persistedPlant.nextWateringDays).toBe(2);
      expect(persistedPlant.nextNutrientDays).toBe(6);
      expect(persistedPlant.nodeCount).toBe(20);
      expect(persistedPlant.stemDiameter).toBe(3.2);
      expect(persistedPlant.phLevel).toBe(6.8);
      expect(persistedPlant.ecPpm).toBe(1600);
      expect(persistedPlant.temperature).toBe(22);
      expect(persistedPlant.humidity).toBe(45);
      expect(persistedPlant.vpd).toBe(1.4);
      expect(persistedPlant.cannabisType).toBe(CannabisType.SATIVA);
      expect(persistedPlant.growMedium).toBe(GrowMedium.HYDROPONIC);
      expect(persistedPlant.lightCondition).toBe(LightCondition.HPS);
      expect(persistedPlant.locationDescription).toBe('Hydroponic Setup Room 2');
      expect(persistedPlant.notes).toBe('Excellent trichome development');
    });

    it('should maintain relationships after persistence', async () => {
      // Create plant with relationships
      await database.write(async () => {
        testPlant = await database.get<Plant>('plants').create((plant) => {
          plant.journalId = 'relationship-test-journal';
          plant.name = 'Relationship Test Plant';
          plant.strain = 'Test Strain';
          plant.plantedDate = '2025-01-01';
          plant.growthStage = GrowthStage.VEGETATIVE;
          plant.userId = 'test-user-id';
        });

        testPhoto = await database.get<PlantPhoto>('plant_photos').create((photo) => {
          photo.plantId = testPlant.id;
          photo.imageUrl = 'https://example.com/relationship-test.jpg';
          photo.growthStage = GrowthStage.VEGETATIVE;
          photo.takenAt = new Date();
        });

        testMetrics = await database.get<PlantMetrics>('plant_metrics').create((metrics) => {
          metrics.plantId = testPlant.id;
          metrics.healthPercentage = 85;
          metrics.recordedAt = new Date();
        });
      });

      const plantId = testPlant.id;

      // Fetch fresh instances to simulate persistence
      const persistedPlant = await database.get<Plant>('plants').find(plantId);
      const plantPhotos = await persistedPlant.plantPhotos.fetch();
      const plantMetrics = await persistedPlant.plantMetrics.fetch();

      expect(plantPhotos).toHaveLength(1);
      expect(plantPhotos[0].plantId).toBe(plantId);
      expect(plantPhotos[0].imageUrl).toBe('https://example.com/relationship-test.jpg');

      expect(plantMetrics).toHaveLength(1);
      expect(plantMetrics[0].plantId).toBe(plantId);
      expect(plantMetrics[0].healthPercentage).toBe(85);
    });
  });

  describe('Derived Properties and Calculations', () => {
    beforeEach(async () => {
      await database.write(async () => {
        testPlant = await database.get<Plant>('plants').create((plant) => {
          plant.journalId = 'test-journal-id';
          plant.name = 'Calculation Test Plant';
          plant.strain = 'Test Strain';
          plant.plantedDate = '2025-01-01';
          plant.growthStage = GrowthStage.VEGETATIVE;
          plant.userId = 'test-user-id';
        });
      });
    });

    it('should calculate days since planting correctly', () => {
      const daysSincePlanting = testPlant.daysSincePlanting;
      const expectedDays = Math.floor(
        (new Date().getTime() - new Date('2025-01-01').getTime()) / (1000 * 60 * 60 * 24)
      );
      
      expect(daysSincePlanting).toBe(expectedDays);
    });

    it('should calculate VPD correctly in PlantMetrics', async () => {
      await database.write(async () => {
        testMetrics = await database.get<PlantMetrics>('plant_metrics').create((metrics) => {
          metrics.plantId = testPlant.id;
          metrics.temperature = 25;
          metrics.temperatureUnit = 'celsius';
          metrics.humidity = 60;
          metrics.recordedAt = new Date();
        });
      });

      const calculatedVPD = PlantMetrics.calculateVPD(25, 60, 'celsius');
      expect(calculatedVPD).toBeCloseTo(1.27, 2);

      // Test with Fahrenheit
      const vpdFahrenheit = PlantMetrics.calculateVPD(77, 60, 'fahrenheit');
      expect(vpdFahrenheit).toBeCloseTo(1.27, 2);
    });
  });

  describe('Care Reminder Integration', () => {
    beforeEach(async () => {
      await database.write(async () => {
        testPlant = await database.get<Plant>('plants').create((plant) => {
          plant.journalId = 'test-journal-id';
          plant.name = 'Reminder Test Plant';
          plant.strain = 'Test Strain';
          plant.plantedDate = '2025-01-01';
          plant.growthStage = GrowthStage.VEGETATIVE;
          plant.userId = 'test-user-id';
        });
      });
    });

    it('should create and manage care reminders', async () => {
      await database.write(async () => {
        testReminder = await database.get<CareReminder>('care_reminders').create((reminder) => {
          reminder.plantId = testPlant.id;
          reminder.type = 'watering';
          reminder.title = 'Water the plant';
          reminder.description = 'Give 500ml of water';
          reminder.scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
          reminder.isCompleted = false;
          reminder.repeatInterval = 3; // Every 3 days
        });
      });

      expect(testReminder.isActive).toBe(true);
      expect(testReminder.isOverdue).toBe(false);
      expect(testReminder.isDueToday).toBe(false);
      expect(testReminder.isDueSoon).toBe(true);
      expect(testReminder.daysUntilDue).toBe(1);
      expect(testReminder.priorityLevel).toBe('medium');

      // Test completing reminder
      await testReminder.markAsCompleted();
      await testReminder.reload();

      expect(testReminder.isCompleted).toBe(true);
      expect(testReminder.completedAt).toBeDefined();

      // Test snoozing reminder
      await testReminder.markAsIncomplete();
      await testReminder.snooze(2);
      await testReminder.reload();

      expect(testReminder.isCompleted).toBe(false);
      expect(testReminder.daysUntilDue).toBe(3); // 1 + 2 days snooze
    });
  });
});