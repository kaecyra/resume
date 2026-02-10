describe("testing framework", () => {
  it("runs typescript test files", () => {
    const value: string = "vitest works";
    expect(value).toBe("vitest works");
  });

  it("enforces strict type checking", () => {
    const numbers: number[] = [1, 2, 3];
    expect(numbers).toHaveLength(3);
  });
});
