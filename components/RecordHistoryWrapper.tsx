// RecordHistoryWrapper.tsx - Server Component
import getRecords from '@/app/actions/getRecords';
import RecordHistoryClient from './RecordHistoryClient';

const RecordHistoryWrapper = async () => {
  const { records, error } = await getRecords();

  return (
    <RecordHistoryClient 
      initialRecords={records || []} 
      initialError={error || null} 
    />
  );
};

export default RecordHistoryWrapper;