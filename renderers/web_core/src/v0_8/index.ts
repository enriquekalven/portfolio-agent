export * from "./data/model-processor";
export * from "./data/guards";
export * from "./types/primitives";
export * from "./types/types";
export * from "./types/colors";
export * from "./styles/index";
import A2UIClientEventMessage from "./schemas/server_to_client_with_standard_catalog.json" with { type: "json" };

export const Schemas = {
  A2UIClientEventMessage,
};
