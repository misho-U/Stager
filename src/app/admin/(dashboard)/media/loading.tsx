import { Panel } from '@/shared/components/panel';
import { MediaGridSkeleton, PageHeaderSkeleton } from '@/shared/components/skeleton';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton actions={0} />
      <Panel>
        <MediaGridSkeleton />
      </Panel>
    </>
  );
}
