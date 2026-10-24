import VesperNav from "./components/VesperNav";
import VesperHero from "./components/VesperHero";
import Atelier from "./components/Atelier";
import Finder from "./components/Finder";
import DryDown from "./components/DryDown";
import Process from "./components/Process";
import Shelf from "./components/Shelf";
import Sizes from "./components/Sizes";
import Consult from "./components/Consult";
import VesperFooter from "./components/VesperFooter";
import VesperLoader from "./components/VesperLoader";
import Traveller from "./components/Traveller";
import SectionMotion from "./components/SectionMotion";
import Transitions from "./components/Transitions";

export default function Page() {
  return (
    <>
      <VesperLoader />
      <Transitions />
      <VesperNav />
      <main className="v-page">
        <VesperHero />
        <Finder />
        <Shelf />
        <Sizes />
        <Consult />
        <Atelier />
        <DryDown />
        <Process />
      </main>
      <VesperFooter />
      <Traveller />
      <SectionMotion />
    </>
  );
}
