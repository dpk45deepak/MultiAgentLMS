import { TestRunner } from '@/components/assessment/TestRunner';

export default function AssessmentPage({ params }: { params: { assessmentId: string } }) {
  return (
    <div className="mx-auto w-full max-w-5xl xl:max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <TestRunner assessmentId={params.assessmentId} />
    </div>
  );
}
