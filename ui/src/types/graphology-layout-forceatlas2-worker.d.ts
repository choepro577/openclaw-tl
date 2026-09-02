declare module "graphology-layout-forceatlas2/worker" {
  import type { ForceAtlas2LayoutParameters } from "graphology-layout-forceatlas2";
  import type { AbstractGraph, Attributes } from "graphology-types";

  export default class FA2LayoutSupervisor<
    NodeAttributes extends Attributes = Attributes,
    EdgeAttributes extends Attributes = Attributes,
  > {
    constructor(
      graph: AbstractGraph<NodeAttributes, EdgeAttributes>,
      params?: ForceAtlas2LayoutParameters<NodeAttributes, EdgeAttributes>,
    );
    isRunning(): boolean;
    start(): void;
    stop(): void;
    kill(): void;
  }
}
