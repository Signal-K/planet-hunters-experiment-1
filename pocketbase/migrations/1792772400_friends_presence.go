package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// SSL-673: persist the social schema as a compiled PocketBase migration.
//
// The running server also creates these collections for a fresh installation,
// but production upgrades must not rely on that bootstrap side effect. This
// migration is intentionally idempotent so it is safe for databases already
// created by an earlier server version.
func ensureFriendsPresenceSchema(app core.App) error {
	users, err := app.FindCollectionByNameOrId("users")
	if err == nil && users.Fields.GetByName("lastExchangeAt") == nil {
		users.Fields.Add(&core.DateField{Name: "lastExchangeAt"})
		if err := app.Save(users); err != nil {
			return err
		}
	}

	if _, err := app.FindCollectionByNameOrId("friendships"); err != nil {
		friendships := core.NewBaseCollection("friendships")
		friendships.ListRule = types.Pointer("requester = @request.auth.id || addressee = @request.auth.id")
		friendships.ViewRule = types.Pointer("requester = @request.auth.id || addressee = @request.auth.id")
		friendships.Fields.Add(&core.TextField{Name: "requester", Required: true, Max: 64})
		friendships.Fields.Add(&core.TextField{Name: "addressee", Required: true, Max: 64})
		friendships.Fields.Add(&core.SelectField{Name: "status", Required: true, MaxSelect: 1, Values: []string{"pending", "accepted", "declined"}})
		friendships.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		friendships.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		friendships.Indexes = []string{"CREATE UNIQUE INDEX idx_friendships_pair ON friendships (requester, addressee)"}
		if err := app.Save(friendships); err != nil {
			return err
		}
	}

	if _, err := app.FindCollectionByNameOrId("friend_gifts"); err != nil {
		gifts := core.NewBaseCollection("friend_gifts")
		gifts.ListRule = types.Pointer("sender = @request.auth.id || recipient = @request.auth.id")
		gifts.ViewRule = types.Pointer("sender = @request.auth.id || recipient = @request.auth.id")
		gifts.Fields.Add(&core.TextField{Name: "sender", Required: true, Max: 64})
		gifts.Fields.Add(&core.TextField{Name: "recipient", Required: true, Max: 64})
		gifts.Fields.Add(&core.TextField{Name: "gift_date", Required: true, Max: 10})
		gifts.Fields.Add(&core.SelectField{Name: "kind", Required: true, MaxSelect: 1, Values: []string{"currency", "resource", "blueprint"}})
		gifts.Fields.Add(&core.JSONField{Name: "payload", Required: true, MaxSize: 2048})
		gifts.Fields.Add(&core.BoolField{Name: "claimed"})
		gifts.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		gifts.Indexes = []string{"CREATE UNIQUE INDEX idx_friend_gifts_daily ON friend_gifts (sender, recipient, gift_date)"}
		if err := app.Save(gifts); err != nil {
			return err
		}
	}

	return nil
}

func init() {
	core.AppMigrations.Register(ensureFriendsPresenceSchema, nil)
}
