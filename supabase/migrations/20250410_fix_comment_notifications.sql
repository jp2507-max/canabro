-- Create a stored procedure to handle comment creation with proper notifications
CREATE OR REPLACE FUNCTION create_comment(
  p_post_id UUID,
  p_content TEXT,
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  v_post_author_id UUID;
  v_comment_id UUID;
BEGIN
  -- First, get the post author's ID
  SELECT user_id INTO v_post_author_id
  FROM posts
  WHERE id = p_post_id;
  
  -- Insert the comment
  INSERT INTO comments (
    post_id,
    user_id,
    content,
    likes_count,
    created_at
  ) VALUES (
    p_post_id,
    p_user_id,
    p_content,
    0,
    NOW()
  ) RETURNING id INTO v_comment_id;
  
  -- Increment the comments_count in the posts table
  UPDATE posts
  SET comments_count = comments_count + 1
  WHERE id = p_post_id;
  
  -- Only create a notification if the commenter is not the post author
  IF p_user_id <> v_post_author_id THEN
    -- Insert notification for the post author
    INSERT INTO notifications (
      recipient_id,
      actor_id,
      type,
      post_id,
      comment_id,
      is_read,
      created_at
    ) VALUES (
      v_post_author_id,
      p_user_id,
      'comment',
      p_post_id,
      v_comment_id,
      FALSE,
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_comment(UUID, TEXT, UUID) TO authenticated;

-- Ensure RLS is enabled on the notifications table
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies for notifications table
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" 
  ON notifications 
  FOR SELECT 
  USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON notifications;
CREATE POLICY "Users can mark their own notifications as read" 
  ON notifications 
  FOR UPDATE 
  USING (auth.uid() = recipient_id);

-- The create_comment function will handle inserts with SECURITY DEFINER
-- This means it runs with the permissions of the function creator (superuser)
-- so we don't need an INSERT policy for regular users
