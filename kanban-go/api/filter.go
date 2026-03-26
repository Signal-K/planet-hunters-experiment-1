package handler

import "strings"

// starSailorsProjects is the set of project slugs this kanban covers.
var starSailorsProjects = map[string]bool{
	"saily":                       true,
	"planet-hunters-experiment-1": true,
	"client":                      true,
	"coral":                       true,
}

// sprintTag is the label that marks a task as a kanban sprint task.
const sprintTag = "liam-sprint"

// isSprintTask returns true if the task has the sprint super-tag.
func isSprintTask(t *Task) bool {
	for _, l := range t.Labels {
		if strings.ToLower(l) == sprintTag {
			return true
		}
	}
	return false
}
