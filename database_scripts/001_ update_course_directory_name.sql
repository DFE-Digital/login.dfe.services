BEGIN TRAN updateCourseDirectoryName
UPDATE [dbo].[service] 
  SET name='Publish to the course directory' 
  WHERE id='724d02eb-221e-4638-9e01-9b49b1e67750'
  AND name LIKE 'Publish to the Course Directory'
ROLLBACK TRAN updateCourseDirectoryName