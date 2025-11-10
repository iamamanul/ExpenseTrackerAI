'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

async function deleteRecord(recordId: string): Promise<{
  message?: string;
  error?: string;
  success?: boolean;
}> {
  const { userId } = await auth();

  if (!userId) {
    return { error: 'User not found' };
  }

  try {
    await db.record.delete({
      where: {
        id: recordId,
        userId,
      },
    });

    // Return success immediately without revalidatePath for faster UX
    return { message: 'Record deleted', success: true };
  } catch (error) {
    console.error('Error deleting record:', error);
    return { error: 'Failed to delete record', success: false };
  }
}

export default deleteRecord;
