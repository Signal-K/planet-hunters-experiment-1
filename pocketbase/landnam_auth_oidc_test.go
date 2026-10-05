package main

import (
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"

	"landnam-backend/sharedauth"
)

func newUsersApp(t *testing.T) (*tests.TestApp, *core.Collection) {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Cleanup)
	users := core.NewAuthCollection("lnusers")
	users.Fields.Add(&core.TextField{Name: "displayName"}, &core.BoolField{Name: "guest"},
		&core.TextField{Name: "appleSub"}, &core.TextField{Name: "clerkId"})
	if err := app.Save(users); err != nil {
		t.Fatal(err)
	}
	return app, users
}

func TestIdentityUserIsStableAcrossSignIns(t *testing.T) {
	app, users := newUsersApp(t)
	id := &sharedauth.Identity{Subject: "001.abc", Email: "p@x.co", EmailVerified: true}
	first, err := findOrCreateIdentityUser(app, users, "appleSub", id, "Pat Jones")
	if err != nil {
		t.Fatal(err)
	}
	again, err := findOrCreateIdentityUser(app, users, "appleSub", id, "")
	if err != nil || again.Id != first.Id {
		t.Fatalf("returning player must keep the same row: %v %v", again, err)
	}
	if first.GetString("displayName") != "Pat Jones" || first.GetBool("guest") {
		t.Fatalf("unexpected profile: %v", first.PublicExport())
	}
}

func TestIdentityLinksExistingEmailButNotAcrossIdentities(t *testing.T) {
	app, users := newUsersApp(t)
	existing := core.NewRecord(users)
	existing.Set("email", "p@x.co")
	existing.SetPassword("0123456789abcdef")
	if err := app.Save(existing); err != nil {
		t.Fatal(err)
	}
	linked, err := findOrCreateIdentityUser(app, users, "appleSub", &sharedauth.Identity{Subject: "s1", Email: "p@x.co", EmailVerified: true}, "")
	if err != nil || linked.Id != existing.Id {
		t.Fatalf("verified email should link to the existing account: %v %v", linked, err)
	}
	if _, err := findOrCreateIdentityUser(app, users, "appleSub", &sharedauth.Identity{Subject: "s2", Email: "p@x.co", EmailVerified: true}, ""); err == nil {
		t.Fatal("a second Apple identity must not take over an already-bound account")
	}
	fresh, err := findOrCreateIdentityUser(app, users, "appleSub", &sharedauth.Identity{Subject: "s3", Email: "q@x.co", EmailVerified: false}, "")
	if err != nil || fresh.Id == existing.Id {
		t.Fatalf("unverified email must not link: %v %v", fresh, err)
	}
}
