import { searchIngredients, createIngredient } from "../../../features/ingredients/api";

// ─────────────────────────────────────────────────────────────
// Supabase chainable mock
//
// The Supabase query builder is a fluent API.  Every method returns
// the same builder object; terminal methods (.returns(), .single())
// return a Promise with { data, error }.  We expose each method as a
// spy so individual tests can assert what was called.
// ─────────────────────────────────────────────────────────────
vi.mock("../../../lib/supabaseClient", () => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainedMethods = [
    "from",
    "select",
    "insert",
    "eq",
    "ilike",
    "order",
    "limit",
  ];

  // All chained methods return the builder itself
  for (const method of chainedMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Terminal methods are reconfigured per-test via mockResolvedValue
  builder.returns = vi.fn().mockResolvedValue({ data: [], error: null });
  builder.single = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  return { supabase: builder };
});

import { supabase } from "../../../lib/supabaseClient";

// Convenience cast so TypeScript knows these are mocked
const db = supabase as unknown as Record<string, ReturnType<typeof vi.fn>>;

// ─────────────────────────────────────────────────────────────
// searchIngredients
// ─────────────────────────────────────────────────────────────
describe("searchIngredients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chainability after clearAllMocks
    for (const fn of ["from", "select", "ilike", "order", "limit"]) {
      db[fn].mockReturnValue(db);
    }
    db.returns.mockResolvedValue({ data: [], error: null });
  });

  it("returns an empty array immediately when the term is empty", async () => {
    const result = await searchIngredients("");
    expect(result).toEqual([]);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("returns an empty array immediately when the term is only whitespace", async () => {
    const result = await searchIngredients("   ");
    expect(result).toEqual([]);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("queries the ingredients table", async () => {
    await searchIngredients("chicken");
    expect(db.from).toHaveBeenCalledWith("ingredients");
  });

  it("selects the expected columns", async () => {
    await searchIngredients("chicken");
    expect(db.select).toHaveBeenCalledWith("id,name,category,default_unit");
  });

  it("filters with a case-insensitive LIKE on the lowercased term", async () => {
    await searchIngredients("Chicken");
    expect(db.ilike).toHaveBeenCalledWith("name", "%chicken%");
  });

  it("orders results alphabetically by name", async () => {
    await searchIngredients("oil");
    expect(db.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("applies the default limit of 8", async () => {
    await searchIngredients("oil");
    expect(db.limit).toHaveBeenCalledWith(8);
  });

  it("applies a custom limit when provided", async () => {
    await searchIngredients("oil", 4);
    expect(db.limit).toHaveBeenCalledWith(4);
  });

  it("maps rows to Ingredient objects", async () => {
    db.returns.mockResolvedValue({
      data: [
        { id: "1", name: "chicken breast", category: "meat & seafood", default_unit: "lbs" },
        { id: "2", name: "olive oil", category: "pantry", default_unit: null },
      ],
      error: null,
    });

    const results = await searchIngredients("c");
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: "1",
      name: "chicken breast",
      category: "meat & seafood",
      defaultUnit: "lbs",
    });
    expect(results[1]).toEqual({
      id: "2",
      name: "olive oil",
      category: "pantry",
      defaultUnit: null,
    });
  });

  it("throws when supabase returns an error", async () => {
    db.returns.mockResolvedValue({ data: null, error: { message: "DB error" } });
    await expect(searchIngredients("oil")).rejects.toThrow("DB error");
  });
});

// ─────────────────────────────────────────────────────────────
// createIngredient
// ─────────────────────────────────────────────────────────────
describe("createIngredient", () => {
  const createdRow = {
    id: "new-id",
    name: "garlic",
    category: "produce",
    default_unit: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    for (const fn of ["from", "select", "insert", "eq"]) {
      db[fn].mockReturnValue(db);
    }
    db.maybeSingle.mockResolvedValue({ data: null, error: null });
    db.single.mockResolvedValue({ data: createdRow, error: null });
  });

  it("throws immediately when name is empty", async () => {
    await expect(createIngredient("")).rejects.toThrow(
      "Ingredient name is required."
    );
    expect(db.from).not.toHaveBeenCalled();
  });

  it("throws immediately when name is only whitespace", async () => {
    await expect(createIngredient("   ")).rejects.toThrow(
      "Ingredient name is required."
    );
    expect(db.from).not.toHaveBeenCalled();
  });

  it("checks the ingredients table for an existing name before inserting", async () => {
    await createIngredient("garlic");
    expect(db.from).toHaveBeenCalledWith("ingredients");
    expect(db.eq).toHaveBeenCalledWith("name", "garlic");
    expect(db.maybeSingle).toHaveBeenCalled();
  });

  it("normalises the name to lowercase before inserting", async () => {
    await createIngredient("Chicken Breast");
    const [payload] = db.insert.mock.calls[0] as [{ name: string }];
    expect(payload.name).toBe("chicken breast");
  });

  it("trims surrounding whitespace from the name", async () => {
    await createIngredient("  garlic  ");
    const [payload] = db.insert.mock.calls[0] as [{ name: string }];
    expect(payload.name).toBe("garlic");
  });

  it("uses 'other' as the default category when none is supplied", async () => {
    await createIngredient("garlic");
    const [payload] = db.insert.mock.calls[0] as [{ category: string }];
    expect(payload.category).toBe("other");
  });

  it("passes the supplied category through", async () => {
    await createIngredient("garlic", "produce");
    const [payload] = db.insert.mock.calls[0] as [{ category: string }];
    expect(payload.category).toBe("produce");
  });

  it("returns an existing ingredient without inserting", async () => {
    db.maybeSingle.mockResolvedValue({ data: createdRow, error: null });

    const result = await createIngredient("garlic", "produce");

    expect(db.insert).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: "new-id",
      name: "garlic",
      category: "produce",
      defaultUnit: null,
    });
  });

  it("returns a mapped Ingredient from the database row", async () => {
    const result = await createIngredient("garlic", "produce");
    expect(result).toEqual({
      id: "new-id",
      name: "garlic",
      category: "produce",
      defaultUnit: null,
    });
  });

  it("throws when supabase returns an error", async () => {
    db.single.mockResolvedValue({ data: null, error: { message: "Unique violation" } });
    await expect(createIngredient("garlic")).rejects.toThrow("Unique violation");
  });
});
