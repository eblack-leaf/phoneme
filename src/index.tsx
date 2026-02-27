import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import App from "./App";
import "./index.css";

const Landing = lazy(() => import("./pages/Landing"));
const UseCases = lazy(() => import("./pages/UseCases"));
const WorkLLVM = lazy(() => import("./pages/WorkLLVM"));
const WorkTextClassification = lazy(() => import("./pages/WorkTextClassification"));
const WorkAnomalyDetection = lazy(() => import("./pages/WorkAnomalyDetection"));

render(
  () => (
    <Router root={App} base={"/phoneme"}>
      <Route path="/" component={Landing} />
      <Route path="/use-cases" component={UseCases} />
      <Route path="/work/llvm" component={WorkLLVM} />
      <Route path="/work/text-classification" component={WorkTextClassification} />
      <Route path="/work/anomaly-detection" component={WorkAnomalyDetection} />
    </Router>
  ),
  document.getElementById("root")!,
);
