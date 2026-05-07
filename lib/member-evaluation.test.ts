import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { canEvaluate } from "./member-evaluation.ts"

describe("canEvaluate", () => {
  it("allows BOD users to evaluate executive members", () => {
    assert.equal(
      canEvaluate({
        evaluatorId: "bod-1",
        evaluatorRole: "bod",
        targetId: "exec-1",
        targetRole: "executive",
      }),
      true
    )
  })

  it("blocks BOD users from evaluating regular members", () => {
    assert.equal(
      canEvaluate({
        evaluatorId: "bod-1",
        evaluatorRole: "bod",
        targetId: "member-1",
        targetRole: "user",
      }),
      false
    )
  })

  it("blocks BOD users from evaluating another BOD user", () => {
    assert.equal(
      canEvaluate({
        evaluatorId: "bod-1",
        evaluatorRole: "bod",
        targetId: "bod-2",
        targetRole: "bod",
      }),
      false
    )
  })

  it("allows executives to evaluate members from the same department", () => {
    assert.equal(
      canEvaluate({
        evaluatorId: "exec-1",
        evaluatorRole: "executive",
        evaluatorDepartment: "public relations",
        targetId: "member-1",
        targetRole: "user",
        targetDepartment: "public relations",
        targetPosition: "Marketing Officer",
      }),
      true
    )
  })

  it("blocks executives from evaluating members without a valid position", () => {
    assert.equal(
      canEvaluate({
        evaluatorId: "exec-1",
        evaluatorRole: "executive",
        evaluatorDepartment: "public relations",
        targetId: "member-1",
        targetRole: "user",
        targetDepartment: "public relations",
        targetPosition: "Invalid Position",
      }),
      false
    )
  })

  it("blocks executives from evaluating members from another department", () => {
    assert.equal(
      canEvaluate({
        evaluatorId: "exec-1",
        evaluatorRole: "executive",
        evaluatorDepartment: "public relations",
        targetId: "member-1",
        targetRole: "user",
        targetDepartment: "media and creatives",
        targetPosition: "Productions Officer",
      }),
      false
    )
  })
})
