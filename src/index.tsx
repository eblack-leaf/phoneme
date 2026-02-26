import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import App from "./App";
import "./index.css";

const Landing = lazy(() => import("./pages/Landing"));
const Demo = lazy(() => import("./pages/Demo"));
const WorkLLVM = lazy(() => import("./pages/WorkLLVM"));
const WorkScheduler = lazy(() => import("./pages/WorkScheduler"));
const WorkTextClassification = lazy(() => import("./pages/WorkTextClassification"));
const WorkAnomalyDetection = lazy(() => import("./pages/WorkAnomalyDetection"));
const About = lazy(() => import("./pages/About"));

render(
  () => (
    <Router root={App} base={"/phoneme"}>
      <Route path="/" component={Landing} />
      <Route path="/demo" component={Demo} />
      <Route path="/work/llvm" component={WorkLLVM} />
      <Route path="/work/scheduler" component={WorkScheduler} />
      <Route path="/work/text-classification" component={WorkTextClassification} />
      <Route path="/work/anomaly-detection" component={WorkAnomalyDetection} />
      <Route path="/about" component={About} />
    </Router>
  ),
  document.getElementById("root")!,
);
