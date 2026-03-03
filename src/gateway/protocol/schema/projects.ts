import { Type } from "@sinclair/typebox";
import { NonEmptyString } from "./primitives.js";

export const ProjectsListParamsSchema = Type.Object(
  {
    agentId: Type.Optional(NonEmptyString),
  },
  { additionalProperties: false },
);

export const ProjectsCreateParamsSchema = Type.Object(
  {
    agentId: Type.Optional(NonEmptyString),
    name: NonEmptyString,
  },
  { additionalProperties: false },
);

export const ProjectsSessionsCreateParamsSchema = Type.Object(
  {
    sessionKey: NonEmptyString,
    projectId: NonEmptyString,
    name: Type.Optional(NonEmptyString),
  },
  { additionalProperties: false },
);

export const SessionsCreateParamsSchema = Type.Object(
  {
    sessionKey: NonEmptyString,
    name: Type.Optional(NonEmptyString),
  },
  { additionalProperties: false },
);
