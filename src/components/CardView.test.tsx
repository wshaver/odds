import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { CardView } from "./CardView";

describe("CardView", () => {
  test("renders tens as 10 instead of compact rank T", () => {
    render(<CardView card={{ rank: "T", suit: "s" }} />);

    const card = screen.getByLabelText("Ts");

    expect(within(card).getByText("10")).toBeInTheDocument();
    expect(within(card).queryByText("T")).not.toBeInTheDocument();
  });
});
