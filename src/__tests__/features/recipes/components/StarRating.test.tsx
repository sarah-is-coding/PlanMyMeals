import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StarRating from "../../../../features/recipes/components/StarRating";

describe("StarRating", () => {
  it("renders nothing in read-only mode when there is no rating", () => {
    const { container } = render(<StarRating value={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders read-only filled/empty stars matching the rating", () => {
    render(<StarRating value={3} />);

    const rating = screen.getByRole("img", { name: "Rated 3 out of 5 stars" });
    const stars = rating.querySelectorAll(".star-rating__star");
    expect(stars).toHaveLength(5);
    expect(Array.from(stars).map((star) => star.textContent)).toEqual([
      "★",
      "★",
      "★",
      "☆",
      "☆",
    ]);
  });

  it("does not attach click handlers when onChange is omitted", () => {
    render(<StarRating value={2} />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("calls onChange with the clicked star value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StarRating value={null} onChange={onChange} label="Rate this recipe" />);

    await user.click(screen.getByRole("radio", { name: "Rate 4 stars" }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("clears the rating when clicking the currently selected star", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StarRating value={4} onChange={onChange} label="Rate this recipe" />);

    await user.click(screen.getByRole("radio", { name: "Rate 4 stars" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("disables the star buttons when disabled is true", () => {
    render(<StarRating value={null} onChange={vi.fn()} disabled label="Rate this recipe" />);

    for (const star of screen.getAllByRole("radio")) {
      expect(star).toBeDisabled();
    }
  });
});
