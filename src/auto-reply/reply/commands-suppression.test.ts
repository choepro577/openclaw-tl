import { describe, expect, it } from "vitest";
import { resolveCommandAuthorization } from "../command-auth.js";
import { handleCommands } from "./commands-core.js";
import { buildCommandTestParams } from "./commands.test-harness.js";

describe("suppressed Gateway command text", () => {
  it.each(["/plugins list", "/models", "/reset soft", "/stop"])(
    "continues ordinary chat processing for %s",
    async (body) => {
      const params = buildCommandTestParams(
        body,
        { commands: { text: true } },
        {
          Provider: "webchat",
          Surface: "webchat",
          CommandAuthorized: false,
          CommandInterpretationSuppressed: true,
          CommandTurn: { kind: "normal", source: "message", authorized: false, body },
        },
      );
      params.command.isAuthorizedSender = false;
      expect(await handleCommands(params)).toEqual({ shouldContinue: true });
      expect(params.ctx.Body).toBe(body);
    },
  );

  it.each([false, true])(
    "suppression overrides command allowlists (suppressed=%s)",
    (suppressed) => {
      const auth = resolveCommandAuthorization({
        ctx: {
          Provider: "webchat",
          Surface: "webchat",
          GatewayClientScopes: ["operator.admin"],
          CommandInterpretationSuppressed: suppressed,
        },
        cfg: { commands: { allowFrom: { "*": ["*"] } } },
        commandAuthorized: false,
      });
      expect(auth.isAuthorizedSender).toBe(!suppressed);
      expect(auth.senderIsOwner).toBe(true);
    },
  );
});
