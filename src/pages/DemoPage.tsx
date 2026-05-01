import AnimatedGenerateButton from "@/components/ui/animated-generate-button-shadcn-tailwind";

const DemoOne = () => {
  return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <AnimatedGenerateButton
        labelIdle="Generate"
        labelActive="Building"
        highlightHueDeg={210}
      />
    </div>
  );
};

export default DemoOne;
