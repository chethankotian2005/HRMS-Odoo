import CorrectionQueue from "@/components/admin/CorrectionQueue";

export const metadata = {
  title: "Correction Queue | HRMS",
};

export default function CorrectionPage() {
  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto">
      <CorrectionQueue />
    </div>
  );
}
