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
    var groupName = newGroupNameInput.value;

    switch (createMethod) {
        case 'current-window':
            if (!checkValidName()) {
                return false;
            }
            chrome.tabs.query({lastFocusedWindow: true}, function(tabs) {
                var tabUrls = [];
                for (var i = 0; i < tabs.length; i++) {
                    tabUrls.push(tabs[i].url);
                }
                createGroup(groupName, tabUrls);
                newGroupNameInput.value = '';
            });
            break;
        case 'manual':
            // form validation
            if (!checkValidForm()) {
                return false;
            }
            checkValidName();

            var tabUrls = [];
            var groupUrls = document.getElementById("create-group-urls");
            for (var i = 0; i < groupUrls.childNodes.length - 1; i++) {
                tabUrls.push(groupUrls.childNodes[i].childNodes[0].value);
            }

            var createdGroup = createGroup(groupName, tabUrls);
            if (createdGroup) {
                resetCreateGroupManualForm();
            }
    }
}

function createGroup(name, tabUrls) {
    var newGroup = new Group(name, tabUrls);
    saveGroup(newGroup);
    return newGroup;
}

function saveGroup(group) {
    chrome.storage.sync.get('groups', function(items) {
        var serialized_groups = items.groups;
        if (serialized_groups) {
            for (var i = 0; i < serialized_groups.length; i++) {
                // if group already exists, replace it with the new group
                if (serialized_groups[i].name === group.getName()) {
                    serialized_groups[i] = group.serialize();
                    chrome.storage.sync.set({"groups": serialized_groups});
                    deserializeGroups(serialized_groups);
                    updateGroupsList();
                    return;
                }
            }
        } else {
            serialized_groups = [];
        }
        
        serialized_groups.push(group.serialize());
        chrome.storage.sync.set({"groups": serialized_groups});
        deserializeGroups(serialized_groups);
        updateGroupsList();
    });
    return true;
}

function deserializeGroups(serializedGroups) {
    local_groups = [];
    for (var i = 0; i < serializedGroups.length; i++) {
        if (serializedGroups[i].name) {
            local_groups.push(new Group(serializedGroups[i].name, serializedGroups[i].tab_urls));
        }
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
    var groupContainer = document.createElement("div");
    groupContainer.classList.add("group-container");

    var groupHeader = document.createElement("div");
    groupHeader.classList.add("group-header");

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

    groupHeader.appendChild(groupName);
    groupHeader.appendChild(removeGroupButton);
    groupHeader.appendChild(editGroupButton);
    groupHeader.appendChild(openGroupButton);
    groupHeader.appendChild(clearFloat);

    groupContainer.appendChild(groupHeader);

    groupsList.appendChild(groupContainer);
}

function openGroup(event) {
    var groupName = event.srcElement.value;
    selectedGroup = getGroup(groupName);

    if (!selectedGroup) {
        return;
    }

    var tab_urls = selectedGroup.getTabUrls();
    chrome.windows.create({url: tab_urls});
}

function editGroup(event) {
    // hide the create group and disable the other buttons
    var createGroupSection = document.getElementById('create-group-section');
    createGroupSection.classList.add("hidden");

    var groupsList = document.getElementById("groups-list");
    var buttons = groupsList.getElementsByTagName("button");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
    }


    var editButton = event.srcElement;
    var groupName = editButton.value;
    selectedGroup = getGroup(groupName);

    if (!selectedGroup) {
        return;
    }

    // editButton in groupHeader which is in groupContainer (probably a better way to do this)
    var groupContainer = editButton.parentElement.parentElement;
    var groupHeader = editButton.parentElement;
    changeGroupHeaderForEdit(groupHeader, groupName);
    
    var editGroupUrlsContainer = document.createElement("div");
    editGroupUrlsContainer.id = "edit-group-url-list";

    var tabUrls = selectedGroup.getTabUrls();

    var urlInputDiv = createUrlInput(0, tabUrls[0], false);
    var anotherUrlButton = createAddAnotherUrlButton(function() {
        addAnotherUrl(editGroupUrlsContainer, undefined);
    });

    editGroupUrlsContainer.appendChild(urlInputDiv);
    editGroupUrlsContainer.appendChild(anotherUrlButton);

    // want to show all the urls, can use the same thing from when manually creating a group
    for (i = 1; i < tabUrls.length; i++) {
        addAnotherUrl(editGroupUrlsContainer, tabUrls[i]);
    }
    
    groupContainer.appendChild(editGroupUrlsContainer);

    var clearFloat = document.createElement("div");
    clearFloat.classList += "clear-float";

    groupContainer.appendChild(clearFloat);
}

function changeGroupHeaderForEdit(groupHeader, groupName) {
    // remove open, edit, remove buttons
    while (groupHeader.childNodes.length > 1) {
        groupHeader.removeChild(groupHeader.lastChild);
    }

    var saveButton = document.createElement("button");
    var saveButtonText = document.createTextNode("Save");
    saveButton.appendChild(saveButtonText);
    saveButton.value = groupName;
    saveButton.classList += "save-group-button float-right";
    saveButton.addEventListener("click", function() {
        var successful = updateGroup(groupName);
        if (successful) {
            var createGroupSection = document.getElementById('create-group-section');
            createGroupSection.classList.remove("hidden");
        }
    });

    var cancelButton = document.createElement("button");
    var cancelButtonText = document.createTextNode("Cancel");
    cancelButton.appendChild(cancelButtonText);
    cancelButton.value = groupName;
    cancelButton.classList += "save-group-button float-right";
    cancelButton.addEventListener("click", function() {
        cancelGroupChange();
        var createGroupSection = document.getElementById('create-group-section');
        createGroupSection.classList.remove("hidden");
    });

    var clearFloat = document.createElement("div");
    clearFloat.classList += "clear-float";

    groupHeader.appendChild(saveButton);
    groupHeader.appendChild(cancelButton);
    groupHeader.appendChild(clearFloat);
}

function removeGroupConfirmed(event) {
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
        var createGroupSection = document.getElementById('create-group-section');
        createGroupSection.classList.remove("hidden");
    });
}

function removeGroup(event) {
    clickedButton = event.srcElement;
    var groupContainer = clickedButton.parentElement.parentElement;
    var groupHeader = clickedButton.parentElement;
    var groupName = clickedButton.value;

    var groupsList = document.getElementById("groups-list");
    var buttons = groupsList.getElementsByTagName("button");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
    }

    while (groupHeader.childNodes.length > 0) {
        groupHeader.removeChild(groupHeader.lastChild);
    }

    var createGroupSection = document.getElementById('create-group-section');
    createGroupSection.classList.add("hidden");

    var confirmationMessage = document.createElement("p");
    var confirmationMessageText = document.createTextNode("Are you sure? This action cannot be undone.");
    confirmationMessage.appendChild(confirmationMessageText);
    confirmationMessage.classList += "remove-confirmation";

    var buttonContainer = document.createElement("div");
    buttonContainer.classList.add("remove-confirmation-buttons");

    var cancelButton = document.createElement("button");
    var cancelButtonText = document.createTextNode("Cancel");
    cancelButton.appendChild(cancelButtonText);
    cancelButton.value = groupName;
    cancelButton.classList += "cancel-group-button";
    cancelButton.addEventListener("click", function() {
        cancelGroupChange();
        createGroupSection.classList.remove("hidden");
    });

    var removeButton = document.createElement("button");
    var removeButtonText = document.createTextNode("Remove");
    removeButton.appendChild(removeButtonText);
    removeButton.value = groupName;
    removeButton.classList += "remove-button";
    removeButton.addEventListener("click", removeGroupConfirmed);

    var clearFloat = document.createElement("div");
    clearFloat.classList += "clear-float";

    groupHeader.appendChild(confirmationMessage);
    
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(removeButton);
    groupHeader.appendChild(buttonContainer);
    
    groupHeader.appendChild(clearFloat);
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

function updateGroup(groupName) {
    // form validation
    var groupUrls = document.getElementById("edit-group-url-list");
    var urlsValid = true;
    var tabUrls = [];
    for (var i = 0; i < groupUrls.childNodes.length - 1; i++) {
        urlsValid = urlsValid && checkValidUrl(groupUrls.childNodes[i]);
        if (!urlsValid) {
            return false;
        }
        tabUrls.push(groupUrls.childNodes[i].childNodes[0].value);
    }
    createGroup(groupName, tabUrls);
    return true;
}

function cancelGroupChange() {
    updateGroupsList();
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
            var urlInputDiv = createUrlInput(0, undefined, false);

            anotherURLButton = createAddAnotherUrlButton(function() {
                var createGroupUrlsContainer = document.getElementById("create-group-urls");
                addAnotherUrl(createGroupUrlsContainer, undefined);
            });

            groupUrls.appendChild(urlInputDiv);
            groupUrls.appendChild(anotherURLButton);

            createGroupInfo.textContent = "Group will be made up of all URLs entered below.";
            break;
        default:
    }
}

function createAddAnotherUrlButton(clickCallback) {
    var anotherURLButton = document.createElement("button");
    var buttonText = document.createTextNode("Add another URL");
    anotherURLButton.appendChild(buttonText);
    anotherURLButton.classList += "float-right";
    anotherURLButton.addEventListener("click", function() {
        clickCallback();
    });
    return anotherURLButton;
}

function createUrlInput(index, urlValue, removable) {
    var urlInputDiv = document.createElement("div");
    urlInputDiv.classList += "url-input-row";

    var urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.placeholder = "e.g. https://www.google.com";
    if (urlValue) {
        urlInput.value = urlValue;
    }
    urlInput.classList += "group-url-input";
    urlInput.name = index;
    urlInput.addEventListener("input", function(event) {
        checkValidUrl(urlInputDiv); 
    });

    urlInputDiv.appendChild(urlInput);

    if (removable) {
        var removeUrlButton = document.createElement("button");
        removeUrlButton.textContent = "X";
        removeUrlButton.classList += "remove-button float-right";
        removeUrlButton.name = index;
        removeUrlButton.addEventListener("click", function(event) {
            var urlContainer = event.srcElement.parentElement.parentElement;
            var index = parseInt(event.srcElement.name);
            removeUrlInput(urlContainer, index);
        });
        urlInputDiv.appendChild(removeUrlButton);
    }

    var errorInfo = document.createElement("p");
    errorInfo.textContent = "Enter a URL";
    errorInfo.classList.add("error");

    urlInputDiv.appendChild(errorInfo);
    checkValidUrl(urlInputDiv);

    return urlInputDiv;
}

function addAnotherUrl(groupUrlListContainer, urlValue) {
    var indexOfAddAnotherUrlButton = groupUrlListContainer.children.length - 1;

    // if there is already 1 url (and add button), it is safe to be able to delete the first url
    if (groupUrlListContainer.children.length === 2) {
        var url = groupUrlListContainer.children[0].children[0].value;
        var firstUrlWithButton = createUrlInput(0, url, true);
        removeUrlInput(groupUrlListContainer, 0);
        groupUrlListContainer.insertBefore(firstUrlWithButton, groupUrlListContainer.children[0]);
    }
    var urlInputDiv = createUrlInput(indexOfAddAnotherUrlButton, urlValue, true);

    groupUrlListContainer.insertBefore(urlInputDiv, groupUrlListContainer.children[indexOfAddAnotherUrlButton]);
}

function removeUrlInput(groupUrlListContainer, index) {
    groupUrlListContainer.removeChild(groupUrlListContainer.childNodes[index]);

    // if there is only going to be one remaining url, get rid of the remove button (2 because of the add button)
    if (groupUrlListContainer.children.length === 2) {        
        var url = groupUrlListContainer.children[0].children[0].value;
        var firstUrlNoButton = createUrlInput(0, url, false);
        removeUrlInput(groupUrlListContainer, 0);
        groupUrlListContainer.insertBefore(firstUrlNoButton, groupUrlListContainer.children[0]);
    }

    // update indexes of elements after the one that was removed
    for (var i = index; i < groupUrlListContainer.childNodes.length - 1; i++) {
        groupUrlListContainer.childNodes[i].childNodes[0].name = i;
        groupUrlListContainer.childNodes[i].childNodes[1].name = i;
    }
}

function resetCreateGroupManualForm() {
    var createGroupUrlsContainer = document.getElementById("create-group-urls");
    var urlsToRemove = createGroupUrlsContainer.childNodes.length - 1;
    for (var i = 0; i < urlsToRemove; i++) {
        createGroupUrlsContainer.removeChild(createGroupUrlsContainer.childNodes[0]);
    }
    addAnotherUrl(createGroupUrlsContainer, undefined);
    newGroupNameInput.value = '';
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