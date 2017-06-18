// Get all active tabs in the window
var local_groups = [];

var createGroupButton = document.getElementById("create-group-button");
createGroupButton.addEventListener("click", createGroupClickHandler);

var newGroupNameInput = document.getElementById("create-group-name-input");

initializeGroupsList();

function initializeGroupsList() {
    chrome.storage.sync.get("groups", function(items) {
        var groups = items.groups;
        deserializeGroups(groups);
        updateGroupsList();
    });
}

function createGroupClickHandler() { 
    chrome.tabs.query({}, createGroup);
}

function createGroup(tabs) {
    var name = newGroupNameInput.value;
    newGroupNameInput.value = "";

    var tab_urls = [];
    for (var i = 0; i < tabs.length; i++) {
        tab_urls.push(tabs[i].url);
    }
    var newGroup = new Group(name, tab_urls);
    local_groups.push(newGroup);

    chrome.storage.sync.get('groups', function(items) {
        var serialized_groups = items.groups;
        if (serialized_groups) {
            for (var i = 0; i < serialized_groups.length; i++) {
                if (serialized_groups[i].name === newGroup.getName()) {
                    serialized_groups[i] = newGroup.serialize();
                    chrome.storage.sync.set({"groups": serialized_groups});
                    return;
                }
            }
        } else {
            serialized_groups = [];
        }
        
        serialized_groups.push(newGroup.serialize());
        chrome.storage.sync.set({"groups": serialized_groups});
        deserializeGroups(serialized_groups);
        updateGroupsList();
    });
}

function deserializeGroups(serializedGroups) {
    local_groups = [];
    for (var i = 0; i < serializedGroups.length; i++) {
        local_groups.push(new Group(serializedGroups[i].name, serializedGroups[i].tab_urls));
    }
}

function updateGroupsList() {
    if (local_groups.length === 0) {
        var noGroupsText = document.createElement("p");
        var p_text = document.createTextNode("You don't have any groups yet. Add one below.");
        noGroupsText.appendChild(p_text);
        return;
    }

    var groups_list = document.getElementById("groups-list");
    // clear the list
    while (groups_list.firstChild) {
        groups_list.removeChild(groups_list.firstChild);
    }
    
    for (var i = 0; i < local_groups.length; i++) {
        addGroupToList(local_groups[i]);
    }
}

function addGroupToList(group) {
    var groups_list = document.getElementById("groups-list");
    var group_button = document.createElement("button");
    var button_text = document.createTextNode(group.getName());
    group_button.appendChild(button_text);
    
    group_button.addEventListener("click", openGroup);

    groups_list.appendChild(group_button);
    console.log("creating new group");
}

function openGroup(event) {
    console.log("opening group");
    var groupName = event.srcElement.textContent;
    var selectedGroup;

    for (var i = 0; i < local_groups.length; i++) {
        if (local_groups[i].getName() === groupName) {
            selectedGroup = local_groups[i];
            break;
        }
    }

    if (!selectedGroup) {
        return;
    }

    var tab_urls = selectedGroup.getTabUrls();
    chrome.windows.create({url: tab_urls});
}