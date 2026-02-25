import { Route } from "@solidjs/router";
import { lazy } from "solid-js";
import Nav from "./components/Nav";

const Landing = lazy(() => import("./pages/Landing"));
const Demo = lazy(() => import("./pages/Demo"));
const WorkLLVM = lazy(() => import("./pages/WorkLLVM"));
const WorkScheduler = lazy(() => import("./pages/WorkScheduler"));
const About = lazy(() => import("./pages/About"));

export default function App() {
  return (
    <>
      <Nav />
      <main class="min-h-screen pt-16">
        <Route path="/" component={Landing} />
        <Route path="/demo" component={Demo} />
        <Route path="/work/llvm" component={WorkLLVM} />
        <Route path="/work/scheduler" component={WorkScheduler} />
        <Route path="/about" component={About} />
      </main>
    </>
  );
}
