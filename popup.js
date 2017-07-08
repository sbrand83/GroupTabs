var local_groups = [];

var createGroupButton = document.getElementById("create-group-button");
createGroupButton.addEventListener("click", createGroupClickHandler);

var newGroupNameInput = document.getElementById("create-group-name-input");
newGroupNameInput.addEventListener("input", checkValidName);

var createGroupSelect = document.getElementById("create-group-method-select");
createGroupSelect.addEventListener("change", switchCreateGroupMethod);

initializeGroupsList();

function initializeGroupsList() {
    chrome.storage.sync.get("groups", function(items) {
        var groups = items.groups;
        deserializeGroups(groups);
        updateGroupsList();
    });
}

function createGroupClickHandler() {
    var createMethod = createGroupSelect.selectedOptions[0].value;
    switch (createMethod) {
        case 'current-window':
            chrome.tabs.query({lastFocusedWindow: true}, createGroup);
            break;
        case 'manual':
            var tabUrls = [];
            var groupUrls = document.getElementById("create-group-urls");
            for (var i = 0; i < groupUrls.childNodes.length - 1; i++) {
                // make it look like a tab object
                tabUrls.push({url: groupUrls.childNodes[i].childNodes[0].value});
            }
            var createdGroup = createGroup(tabUrls);
            if (createdGroup) {
                resetCreateGroupManualForm();
            }
    }
}

function createGroup(tabs) {
    // form validation
    if (!checkValidForm()) {
        return false;
    }
    var name = newGroupNameInput.value;
    newGroupNameInput.value = "";
    // resets the name validation message
    checkValidName();

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
    return true;
}

function deserializeGroups(serializedGroups) {
    local_groups = [];
    for (var i = 0; i < serializedGroups.length; i++) {
        local_groups.push(new Group(serializedGroups[i].name, serializedGroups[i].tab_urls));
    }
}

function updateGroupsList() {
    var groups_list = document.getElementById("groups-list");
    // clear the list
    while (groups_list.firstChild) {
        groups_list.removeChild(groups_list.firstChild);
    }

    if (local_groups.length === 0) {
        var noGroupsText = document.createElement("p");
        var p_text = document.createTextNode("You don't have any groups yet. Add one below.");
        noGroupsText.appendChild(p_text);
        groups_list.appendChild(noGroupsText);
    } else {
        for (var i = 0; i < local_groups.length; i++) {
            addGroupToList(local_groups[i]);
        }
    }
}

function addGroupToList(group) {
    var groupRow = document.createElement("div");
    groupRow.classList.add("group-row");

    var groupsList = document.getElementById("groups-list");
    var groupName = document.createElement("h3");
    var groupNameText = document.createTextNode(group.getName());
    groupName.appendChild(groupNameText);
    groupName.classList += "group-name";

    var openGroupButton = document.createElement("button");
    var openGroupButtonText = document.createTextNode("Open");
    openGroupButton.appendChild(openGroupButtonText);
    openGroupButton.value = group.getName();
    openGroupButton.classList += "open-group-button float-right";
    openGroupButton.addEventListener("click", openGroup);

    var editGroupButton = document.createElement("button");
    var editGroupButtonText = document.createTextNode("Edit");
    editGroupButton.appendChild(editGroupButtonText);
    editGroupButton.value = group.getName();
    editGroupButton.classList += "edit-group-button float-right";
    editGroupButton.addEventListener("click", editGroup);

    var removeGroupButton = document.createElement("button");
    var removeGroupButtonText = document.createTextNode("Remove");
    removeGroupButton.appendChild(removeGroupButtonText);
    removeGroupButton.value = group.getName();
    removeGroupButton.classList += "remove-button float-right";
    removeGroupButton.addEventListener("click", removeGroup);

    var clearFloat = document.createElement("div");
    clearFloat.classList += "clear-float";

    groupRow.appendChild(groupName);
    groupRow.appendChild(removeGroupButton);
    groupRow.appendChild(editGroupButton);
    groupRow.appendChild(openGroupButton);
    groupRow.appendChild(clearFloat);

    groupsList.appendChild(groupRow);
}

function openGroup(event) {
    var groupName = event.srcElement.value;
    selectedGroup = getGroup(groupName);

    var tab_urls = selectedGroup.getTabUrls();
    chrome.windows.create({url: tab_urls});
}

function editGroup(event) {
    var groupName = event.srcElement.value;
    selectedGroup = getGroup(groupName);
    
    var tab_urls = selectedGroup.getTabUrls();

    // want to show all the urls, can use the same thing from when manually ccreating a group
}

function removeGroup(event) {
    var groupName = event.srcElement.value;

    chrome.storage.sync.get('groups', function(items) {
        var serialized_groups = items.groups;
        if (serialized_groups) {
            for (var i = 0; i < serialized_groups.length; i++) {
                if (serialized_groups[i].name === groupName) {
                    //remove the group if it is there
                    serialized_groups.splice(i, 1);
                    chrome.storage.sync.set({"groups": serialized_groups});
                }
            }
        } else {
            serialized_groups = [];
        }

        deserializeGroups(serialized_groups);
        updateGroupsList();
    });
}

function getGroup(groupName) {
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
    return selectedGroup;
}

function switchCreateGroupMethod(event) {
    var selected = event.srcElement.selectedOptions[0].value;

    var groupUrls = document.getElementById("create-group-urls");
    var createGroupInfo = document.getElementById("create-group-info");

    switch (selected) {
        case 'current-window':
            while (groupUrls.firstChild) {
                groupUrls.removeChild(groupUrls.firstChild);
            }
            createGroupInfo.textContent = "Group will be made up of all tabs in the current window.";
            break;
        case 'manual':
            var urlInputDiv = createUrlInput(0);

            var anotherURLButton = document.createElement("button");
            var buttonText = document.createTextNode("Add another URL");
            anotherURLButton.appendChild(buttonText);
            anotherURLButton.classList += "float-right";
            anotherURLButton.addEventListener("click", function() {
                var createGroupUrlsContainer = document.getElementById("create-group-urls");
                addAnotherUrl(createGroupUrlsContainer);
            });

            groupUrls.appendChild(urlInputDiv);
            groupUrls.appendChild(anotherURLButton);

            createGroupInfo.textContent = "Group will be made up of all URLs entered below.";
            break;
        default:
    }
}

function createUrlInput(index) {
    var urlInputDiv = document.createElement("div");
    urlInputDiv.classList += "url-input-row";

    var urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.placeholder = "https://www.google.com";
    urlInput.classList += "create-group-url-input";
    urlInput.name = index;
    urlInput.addEventListener("input", function(event) {
        checkValidUrl(urlInputDiv); 
    });

    urlInputDiv.appendChild(urlInput);

    // don't want to be able to remove first url
    if (index !== 0) {
        var removeUrlButton = document.createElement("button");
        removeUrlButton.textContent = "X";
        removeUrlButton.classList += "remove-button float-right";
        removeUrlButton.name = index;
        removeUrlButton.addEventListener("click", removeUrlInput);
        urlInputDiv.appendChild(removeUrlButton);
    }

    var errorInfo = document.createElement("p");
    errorInfo.textContent = "Enter a URL";
    errorInfo.classList.add("error");

    urlInputDiv.appendChild(errorInfo);
    
    return urlInputDiv;
}

function addAnotherUrl(groupUrlListContainer) {
    var indexOfAddAnotherUrlButton = groupUrlListContainer.children.length - 1;
    var urlInputDiv = createUrlInput(indexOfAddAnotherUrlButton);

    groupUrlListContainer.insertBefore(urlInputDiv, groupUrlListContainer.children[indexOfAddAnotherUrlButton]);
}

function removeUrlInput(event) {
    var index = parseInt(event.srcElement.name);
    var groupUrls = document.getElementById("create-group-urls");

    groupUrls.removeChild(groupUrls.childNodes[index]);

    // update indexes of elements after the one that was removed
    for (var i = index; i < groupUrls.childNodes.length - 1; i++) {
        groupUrls.childNodes[i].childNodes[0].name = i;
        groupUrls.childNodes[i].childNodes[1].name = i;
    }
}

function resetCreateGroupManualForm() {
    var createGroupUrlsContainer = document.getElementById("create-group-urls");
    var urlsToRemove = createGroupUrlsContainer.childNodes.length - 1;
    for (var i = 0; i < urlsToRemove; i++) {
        createGroupUrlsContainer.removeChild(createGroupUrlsContainer.childNodes[0]);
    }
    addAnotherUrl(createGroupUrlsContainer);
}

function checkValidForm() {
    var createMethod = createGroupSelect.selectedOptions[0].value;
    switch (createMethod) {
        case 'current-window':
            return checkValidName();
        case 'manual':
            var groupUrls = document.getElementById("create-group-urls");
            var urlsValid = true;
            for (var i = 0; i < groupUrls.childNodes.length - 1; i++) {
                urlsValid = urlsValid && checkValidUrl(groupUrls.childNodes[i]);
                if (!urlsValid) {
                    return false;
                }
            }
            return checkValidName() && urlsValid;
    }
}

function checkValidName() {
    var errorInfo = document.getElementById("name-error-info");
    var name = newGroupNameInput.value;

    //check that name is not empty
    if (name === "") {
        errorInfo.textContent = "Enter a group name";
        errorInfo.classList.remove("valid");
        errorInfo.classList.add("error");
        return false;
    }

    // check that the name is not too long (mostly to keep UI clean)
    if (name.length >= 28) {
        errorInfo.textContent = "The name is too long. Please choose a shorter name.";
        errorInfo.classList.remove("valid");
        errorInfo.classList.add("error");
        return false;
    }

    // check that the name is unique
    for (var i = 0; i < local_groups.length; i++) {
        if (local_groups[i].name === name) {
            errorInfo.textContent = "You already have a group named '" + name + "'. Please choose another name.";
            errorInfo.classList.remove("valid");
            errorInfo.classList.add("error");
            return false;
        }
    }

    // name is valid
    errorInfo.textContent = "Valid name";
    errorInfo.classList.remove("error");
    errorInfo.classList.add("valid");
    return true;
}

function checkValidUrl(urlInputDiv) {
    // lastChild because there may or may not be a remove button in there
    var errorInfo = urlInputDiv.lastChild;
    var urlInput = urlInputDiv.firstChild;

    if (urlInput.value === "") {
        errorInfo.textContent = "Enter a URL";
        errorInfo.classList.remove("valid");
        errorInfo.classList.add("error");
        return false;
    }

    errorInfo.textContent = "";
    return true;
}