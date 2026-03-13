describe("Star Sailors Shell - Mobile", () => {
  beforeEach(() => {
    cy.viewport("iphone-x");
    cy.visit("/");
  });

  it("should show mobile-specific UI elements", () => {
    // Check if the HUD button exists (only in PWA/Mobile shell context)
    // Note: react-shell.js uses isMobile based on viewport width
    cy.get("button").contains("Show HUD").should("exist");
  });

  it("should have closeable feedback dialog", () => {
    // Mock the feedback requested event
    cy.window().then((win) => {
      win.postMessage({
        source: "planet-hunters",
        event: "feedback_requested",
        payload: { source: "test" }
      }, "*");
    });

    cy.get("#planet-hunters-feedback-overlay").should("be.visible");
    cy.contains("button", "Close").click();
    cy.get("#planet-hunters-feedback-overlay").should("not.exist");
  });
});
