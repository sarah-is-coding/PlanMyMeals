import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IngredientNameCombobox from "../../../../features/recipes/components/IngredientNameCombobox";
import { INGREDIENT_CATEGORIES } from "../../../../features/ingredients/types";

// Mock the entire ingredients API so tests never hit the network
vi.mock("../../../../features/ingredients/api", () => ({
  searchIngredients: vi.fn(),
  createIngredient: vi.fn(),
}));

import {
  searchIngredients,
  createIngredient,
} from "../../../../features/ingredients/api";

const mockSearch = vi.mocked(searchIngredients);
const mockCreate = vi.mocked(createIngredient);

const CHICKEN = {
  id: "ing-1",
  name: "chicken breast",
  category: "meat & seafood" as const,
  defaultUnit: "lbs",
};

const OLIVE_OIL = {
  id: "ing-2",
  name: "olive oil",
  category: "pantry" as const,
  defaultUnit: null,
};

// How long to wait for the debounce + React re-render (debounce is 280ms)
const AFTER_DEBOUNCE = { timeout: 1500 };

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function setup(value = "", onSelect = vi.fn(), readOnly = false) {
  const user = userEvent.setup();
  render(
    <IngredientNameCombobox value={value} onSelect={onSelect} readOnly={readOnly} />
  );
  return { user, onSelect, input: screen.getByRole("combobox") };
}

// Opens the category picker by typing and clicking "Add new"
async function openCategoryPicker(
  user: ReturnType<typeof userEvent.setup>,
  query = "garlic"
) {
  mockSearch.mockResolvedValue([]);
  const input = screen.getByRole("combobox");
  await user.type(input, query);
  await waitFor(
    () => screen.getByText(new RegExp(`add "${query}" as new ingredient`, "i")),
    AFTER_DEBOUNCE
  );
  await user.click(
    screen.getByText(new RegExp(`add "${query}" as new ingredient`, "i"))
  );
  await waitFor(() => screen.getByText(/pick a category/i));
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────
describe("IngredientNameCombobox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue([]);
    mockCreate.mockResolvedValue({
      id: "new-ing-1",
      name: "garlic",
      category: "produce",
      defaultUnit: null,
    });
  });

  // ── Rendering ──────────────────────────────────────────────
  describe("rendering", () => {
    it("renders a combobox input", () => {
      setup();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("displays the current value", () => {
      setup("olive oil");
      expect(screen.getByRole("combobox")).toHaveValue("olive oil");
    });

    it("in readOnly mode renders a plain input, not a combobox", () => {
      const user = userEvent.setup();
      render(
        <IngredientNameCombobox value="olive oil" onSelect={vi.fn()} readOnly />
      );
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("olive oil")).toHaveAttribute("readonly");
    });

    it("does not show a dropdown initially", () => {
      setup();
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  // ── Search phase ───────────────────────────────────────────
  describe("search phase", () => {
    it("shows suggestions after the debounce fires", async () => {
      mockSearch.mockResolvedValue([CHICKEN, OLIVE_OIL]);
      const { user, input } = setup();

      await user.type(input, "chick");

      await waitFor(
        () => expect(screen.getByText("chicken breast")).toBeInTheDocument(),
        AFTER_DEBOUNCE
      );
    });

    it("shows the ingredient category greyed out next to each suggestion", async () => {
      mockSearch.mockResolvedValue([CHICKEN]);
      const { user, input } = setup();

      await user.type(input, "chick");

      await waitFor(
        () => expect(screen.getByText("meat & seafood")).toBeInTheDocument(),
        AFTER_DEBOUNCE
      );
    });

    it("calls onSelect with id and name when a suggestion is clicked", async () => {
      mockSearch.mockResolvedValue([CHICKEN]);
      const onSelect = vi.fn();
      const { user, input } = setup("", onSelect);

      await user.type(input, "chick");
      await waitFor(() => screen.getByText("chicken breast"), AFTER_DEBOUNCE);
      await user.click(screen.getByText("chicken breast"));

      expect(onSelect).toHaveBeenCalledOnce();
      expect(onSelect).toHaveBeenCalledWith("ing-1", "chicken breast");
    });

    it("updates the input to the selected ingredient name after clicking", async () => {
      mockSearch.mockResolvedValue([CHICKEN]);
      const { user, input } = setup();

      await user.type(input, "chick");
      await waitFor(() => screen.getByText("chicken breast"), AFTER_DEBOUNCE);
      await user.click(screen.getByText("chicken breast"));

      expect(input).toHaveValue("chicken breast");
    });

    it("closes the dropdown after selecting a suggestion", async () => {
      mockSearch.mockResolvedValue([CHICKEN]);
      const { user, input } = setup();

      await user.type(input, "chick");
      await waitFor(() => screen.getByText("chicken breast"), AFTER_DEBOUNCE);
      await user.click(screen.getByText("chicken breast"));

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("shows an 'Add new' option when the query has no exact match", async () => {
      mockSearch.mockResolvedValue([]);
      const { user, input } = setup();

      await user.type(input, "garlic");

      await waitFor(
        () =>
          expect(
            screen.getByText(/add "garlic" as new ingredient/i)
          ).toBeInTheDocument(),
        AFTER_DEBOUNCE
      );
    });

    it("resets input to last committed value and closes on Escape", async () => {
      mockSearch.mockResolvedValue([CHICKEN]);
      const { user, input } = setup("olive oil");

      await user.clear(input);
      await user.type(input, "chick");
      await waitFor(() => screen.getByText("chicken breast"), AFTER_DEBOUNCE);

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(input).toHaveValue("olive oil");
    });
  });

  // ── Category picker phase ──────────────────────────────────
  describe("category picker phase", () => {
    it("transitions to the category picker when 'Add new' is clicked", async () => {
      const { user } = setup();
      await openCategoryPicker(user);

      expect(screen.getByText(/pick a category/i)).toBeInTheDocument();
    });

    it("shows all 8 category pills", async () => {
      const { user } = setup();
      await openCategoryPicker(user);

      for (const cat of INGREDIENT_CATEGORIES) {
        expect(screen.getByRole("option", { name: cat })).toBeInTheDocument();
      }
    });

    it("calls createIngredient with the typed name and selected category", async () => {
      const { user } = setup();
      await openCategoryPicker(user, "garlic");

      await user.click(screen.getByRole("option", { name: "produce" }));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith("garlic", "produce");
      });
    });

    it("calls onSelect with the new ingredient id and name after creation", async () => {
      const onSelect = vi.fn();
      mockCreate.mockResolvedValue({
        id: "new-ing-1",
        name: "garlic",
        category: "produce",
        defaultUnit: null,
      });
      render(<IngredientNameCombobox value="" onSelect={onSelect} />);

      await openCategoryPicker(userEvent.setup(), "garlic");
      await userEvent.click(screen.getByRole("option", { name: "produce" }));

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledWith("new-ing-1", "garlic");
      });
    });

    it("updates the input to the created ingredient name after picking a category", async () => {
      mockCreate.mockResolvedValue({
        id: "new-ing-1",
        name: "garlic",
        category: "produce",
        defaultUnit: null,
      });
      const { user } = setup();
      await openCategoryPicker(user, "garlic");
      await user.click(screen.getByRole("option", { name: "produce" }));

      await waitFor(() => {
        expect(screen.getByRole("combobox")).toHaveValue("garlic");
      });
    });

    it("returns to search phase when '← back' is clicked", async () => {
      const { user } = setup();
      await openCategoryPicker(user);

      await user.click(screen.getByText(/← back/i));

      await waitFor(() => {
        expect(screen.queryByText(/pick a category/i)).not.toBeInTheDocument();
      });
    });

    it("returns to search phase on Escape from the category picker", async () => {
      const { user } = setup();
      await openCategoryPicker(user);

      // Fire keydown directly on the input — user.keyboard targets activeElement
      // which may shift after the phase transition animation
      fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByText(/pick a category/i)).not.toBeInTheDocument();
      });
    });
  });

  // ── Regression: unmounted target should not trigger close ──
  describe("click-outside safety", () => {
    it("does not treat a detached node as a click outside", () => {
      // Regression: in real browsers React 18 flushes state synchronously
      // during native events.  When "Add new" is clicked, enterCategorizePhase
      // re-renders the component, unmounting the <li>.  The event then
      // continues bubbling to the document mousedown listener whose
      // event.target is now detached.  Without the document.contains()
      // guard, containerRef.current.contains(detachedLi) returns false and
      // closeAndReset() fires — collapsing the dropdown immediately.
      //
      // We reproduce the scenario by:
      //   1. Rendering the combobox and opening it.
      //   2. Detaching a node to mimic the unmount.
      //   3. Dispatching a native mousedown ON the detached node — JSDOM
      //      propagates it up to the document, exactly as a browser would.

      const { input } = setup("committed");

      // Force the dropdown open by simulating a change event
      fireEvent.change(input, { target: { value: "miso" } });

      // Build a detached li that represents the unmounted "Add new" element
      const detachedLi = document.createElement("li");
      // Do NOT append it to the DOM — it is detached

      // Dispatch mousedown on the detached node.  Native event bubbling in
      // JSDOM stops at the node's own disconnected tree, so the document
      // listener never sees a target inside containerRef → without the fix
      // the guard would need to know the target is detached.
      // We verify the fix by calling the listener logic directly:
      const mousedownEvent = new MouseEvent("mousedown", { bubbles: true });
      Object.defineProperty(mousedownEvent, "target", {
        value: detachedLi,
        configurable: true,
      });
      document.dispatchEvent(mousedownEvent);

      // The input should still hold the typed value — closeAndReset() must
      // NOT have been called (it would reset query to "committed").
      expect(input).toHaveValue("miso");
    });
  });

  // ── End-to-end: adding a brand-new ingredient ──────────────
  describe("end-to-end: user adds a new ingredient with a category", () => {
    it("full flow — type → no match → add new → pick category → committed", async () => {
      const onSelect = vi.fn();
      mockCreate.mockResolvedValue({
        id: "ei-99",
        name: "tamarind paste",
        category: "pantry",
        defaultUnit: null,
      });

      const user = userEvent.setup();
      render(<IngredientNameCombobox value="" onSelect={onSelect} />);
      const input = screen.getByRole("combobox");

      // 1. User types an ingredient not yet in the database
      mockSearch.mockResolvedValue([]);
      await user.type(input, "tamarind paste");

      // 2. "Add new" option appears (no existing matches)
      await waitFor(
        () =>
          expect(
            screen.getByText(/add "tamarind paste" as new ingredient/i)
          ).toBeInTheDocument(),
        AFTER_DEBOUNCE
      );
      expect(screen.queryByText(/pick a category/i)).not.toBeInTheDocument();

      // 3. User clicks "Add new" → category picker slides in
      await user.click(screen.getByText(/add "tamarind paste" as new ingredient/i));
      await waitFor(() =>
        expect(screen.getByText(/pick a category for "tamarind paste"/i)).toBeInTheDocument()
      );

      // 4. All 8 category pills are visible
      for (const cat of INGREDIENT_CATEGORIES) {
        expect(screen.getByRole("option", { name: cat })).toBeInTheDocument();
      }

      // 5. User selects "pantry"
      await user.click(screen.getByRole("option", { name: "pantry" }));

      // 6. createIngredient was called with the right name + category
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith("tamarind paste", "pantry");
      });

      // 7. onSelect fires with the new ingredient's id and name
      expect(onSelect).toHaveBeenCalledWith("ei-99", "tamarind paste");

      // 8. Input reflects the committed name; category picker is gone
      expect(input).toHaveValue("tamarind paste");
      expect(screen.queryByText(/pick a category/i)).not.toBeInTheDocument();
    });

    it("full flow — type → existing match → select it → committed without category picker", async () => {
      const onSelect = vi.fn();
      mockSearch.mockResolvedValue([CHICKEN]);

      const user = userEvent.setup();
      render(<IngredientNameCombobox value="" onSelect={onSelect} />);
      const input = screen.getByRole("combobox");

      // 1. User types and sees an existing suggestion
      await user.type(input, "chicken");
      await waitFor(() => screen.getByText("chicken breast"), AFTER_DEBOUNCE);

      // 2. Category picker never appeared
      expect(screen.queryByText(/pick a category/i)).not.toBeInTheDocument();

      // 3. User clicks the suggestion — committed immediately
      await user.click(screen.getByText("chicken breast"));

      expect(onSelect).toHaveBeenCalledWith("ing-1", "chicken breast");
      expect(mockCreate).not.toHaveBeenCalled();
      expect(input).toHaveValue("chicken breast");
    });
  });
});
