describe("Star Sailors Shell - Desktop", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.visit("/");
  });

  it("should display the app title", () => {
    cy.contains("Star Sailors").should("be.visible");
  });

  it("should be able to open the menu and show advanced settings", () => {
    cy.contains("Exit to Menu").click();
    cy.contains("Show Advanced Settings").click();
    cy.contains("Testing Shortcuts").should("be.visible");
  });
});
