// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyARH_3wHvjGT7ZygG6CPnhn0SxEFfhUVjk",
    authDomain: "chat-application-f01d6.firebaseapp.com",
    databaseURL: "https://chat-application-f01d6-default-rtdb.firebaseio.com",
    projectId: "chat-application-f01d6",
    storageBucket: "chat-application-f01d6.appspot.com",
    messagingSenderId: "944324015150",
    appId: "1:944324015150:web:00b2c1759cb91606171bbf",
    measurementId: "G-88DKC8HPSL"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

const googleLoginBtn = document.getElementById("google-login-btn");
const guestLoginBtn = document.getElementById("guest-login-btn");
const logoutBtn = document.getElementById("logout-btn");
const logoutBtnn = document.getElementById("logout-btnn");

let username = "";
let currentRoom = "";

// Handle Google Sign-In
googleLoginBtn.addEventListener("click", function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => {
            const user = result.user;
            username = user.displayName;
            localStorage.setItem('username', username);
            localStorage.setItem('authType', 'google');
            // Hide login container and show chat container
            document.getElementById("login-container").style.display = "none";
            document.getElementById("container").style.display = "flex";
            initializeChat();
            console.log("User signed in:", user);
        })
        .catch(error => {
            console.error("Error signing in with Google:", error);
        });
});

// Function to handle guest login
guestLoginBtn.addEventListener('click', () => {
    username = `Guest_${Math.floor(Math.random() * 10000)}`;
    localStorage.setItem('username', username);
    localStorage.setItem('authType', 'guest');
    document.getElementById('login-container').style.display = 'none';
    document.getElementById("container").style.display = "flex";
    // Disable room creation for guests
    document.getElementById("create-room").style.display = "none";
    initializeChat();
});

// Function to re-authenticate user
function reauthenticate() {
    const savedUsername = localStorage.getItem('username');
    const authType = localStorage.getItem('authType');
    if (savedUsername && authType) {
        username = savedUsername;
        if (authType === 'google') {
            // Handle re-authentication for Google users
            auth.getRedirectResult()
                .then(result => {
                    if (result.user) {
                        document.getElementById("login-container").style.display = "none";
                        document.getElementById("container").style.display = "flex";
                        initializeChat();
                    }
                })
                .catch(error => {
                    console.error("Error re-authenticating user:", error);
                });
        } else if (authType === 'guest') {
            document.getElementById("login-container").style.display = "none";
            document.getElementById("container").style.display = "flex";
            // Disable room creation for guests
            document.getElementById("create-room").style.display = "none";
            initializeChat();
        }
    }
}

// Call reauthenticate on page load
window.onload = reauthenticate;

// Function to initialize chat after login
function initializeChat() {
    loadRooms();
    setupRoomForm();
    setupMessageForm();

    // Check if a room is selected
    if (!currentRoom) {
        document.getElementById("chat").style.display = "none";
        document.getElementById("no-room-selected").style.display = "block";
    }

    // Check if the user is a guest
    const authType = localStorage.getItem('authType');
    if (authType === 'guest') {
        document.getElementById("create-room").style.display = "none"; // Hide create room form for guests
        document.getElementById("your-rooms").style.display = "none";
        document.getElementById("no-room-selected").style.display = "block"; // Show additional guest message
    }
}

// Function to setup room creation form
function setupRoomForm() {
    const roomForm = document.getElementById('room-form');

    // Check if the event listener is already added
    if (roomForm._listener) {
        roomForm.removeEventListener('submit', roomForm._listener);
    }

    roomForm._listener = function(e) {
        e.preventDefault();
        const roomInput = document.getElementById('room-input');
        const roomName = roomInput.value.trim();

        // Check if room name is empty
        if (!roomName) {
            alert('Please enter a room name.');
            return;
        }

        // Check if room already exists
        db.ref(`rooms/${roomName}`).once('value', snapshot => {
            if (snapshot.exists()) {
                alert(`Room "${roomName}" already exists.`);
                return;
            } else {
                // Create new room
                db.ref(`rooms/${roomName}`).set({
                        createdBy: username
                    })
                    .then(() => {
                        console.log(`Room "${roomName}" created successfully.`);
                        roomInput.value = ''; // Clear room input after creation
                    })
                    .catch(error => console.error("Error creating room:", error));
            }
        });
    };

    roomForm.addEventListener('submit', roomForm._listener);
}

// Load available chat rooms
function loadRooms() {
    db.ref("rooms").on("child_added", snapshot => {
        const room = snapshot.key;
        const createdBy = snapshot.val().createdBy;
        if (createdBy === username) {
            addRoomToYourList(room, createdBy);
        } else {
            addRoomToList(room, createdBy);
        }
        // Monitor new messages for notification
        monitorNewMessages(room);
    });

    db.ref("rooms").on("child_removed", snapshot => {
        const room = snapshot.key;
        removeRoomFromYourList(room);
        removeRoomFromList(room);
    });
}

// Function to monitor new messages and show notification
function monitorNewMessages(room) {
    db.ref(`rooms/${room}/messages`).on("child_added", snapshot => {
        const message = snapshot.val();
        if (room !== currentRoom) {
            showNotification(`You may have some new messages in room: ${room}`);
        }
    });
}

// Function to show notification
function showNotification(message) {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.style.display = "block";
    setTimeout(() => {
        notification.style.display = "none";
    }, 8000);
}

// Add room to the public room list
function addRoomToList(room, createdBy) {
    const roomListItem = document.createElement("li");
    roomListItem.textContent = room;
    roomListItem.setAttribute("data-room", room);
    roomListItem.classList.add("room-name");
    roomListItem.addEventListener("click", () => selectRoom(room));
    document.getElementById("room-list").appendChild(roomListItem);
}

// Add room to the user's room list
function addRoomToYourList(room, createdBy) {
    const roomListItem = document.createElement("li");
    roomListItem.textContent = room;
    roomListItem.setAttribute("data-room", room);
    roomListItem.classList.add("room-name");
    roomListItem.addEventListener("click", () => selectRoom(room));

    // Add delete button if the current user is the room creator
    if (createdBy === username) {
        const deleteBtn = document.createElement("button");
        deleteBtn.classList.add("delete-room-btn");

        const icon = document.createElement("i");
        icon.classList.add("fas", "fa-trash-alt"); // Font Awesome trash icon

        deleteBtn.appendChild(icon);

        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteRoom(room);
        });

        // Append the delete button to place it at the right side
        roomListItem.appendChild(deleteBtn);
    }

    document.getElementById("your-room-list").appendChild(roomListItem);
}

// Remove room from the public room list
function removeRoomFromList(room) {
    const roomListItem = document.querySelector(`#room-list li[data-room="${room}"]`);
    if (roomListItem) {
        roomListItem.remove();
    }
}

// Remove room from the user's room list
function removeRoomFromYourList(room) {
    const roomListItem = document.querySelector(`#your-room-list li[data-room="${room}"]`);
    if (roomListItem) {
        roomListItem.remove();
    }
}

// Function to select a chat room
function selectRoom(room) {
    currentRoom = room;
    document.getElementById("room-name").textContent = room;
    document.getElementById("no-room-selected").style.display = "none";
    document.getElementById("chat").style.display = "flex"; // Show chat area
    document.getElementById("messages").innerHTML = ""; // Clear previous messages
    db.ref(`rooms/${room}/messages`).on("child_added", snapshot => {
        const message = snapshot.val();
        displayMessage(message);
    });

    // Remove active class from all room list items
    const roomListItems = document.querySelectorAll('#room-list li, #your-room-list li');
    roomListItems.forEach(item => item.classList.remove('active'));

    // Add active class to the selected room list item
    const selectedRoomListItem = document.querySelector(`#room-list li[data-room="${room}"], #your-room-list li[data-room="${room}"]`);
    if (selectedRoomListItem) {
        selectedRoomListItem.classList.add('active');
    }

    // Display room creator
    db.ref(`rooms/${room}`).once("value", snapshot => {
        const createdBy = snapshot.val().createdBy;
        document.getElementById("created-by").textContent = `Created by: ${createdBy}`;
    });
}

// Function to display a message in the chat area
function displayMessage(message) {
    const messageElement = document.createElement("li");
    const messageDate = new Date(message.timestamp);
    const currentDate = new Date();

    let dateString = "";

    if (isSameDay(messageDate, currentDate)) {
        dateString = "Today";
    } else if (isYesterday(messageDate, currentDate)) {
        dateString = "Yesterday";
    } else {
        dateString = messageDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    const messageHTML = `
        <div class="message ${message.username === username ? 'sent' : 'received'}">
            <div class="message-content">
                <span class="message-sender">${message.username}</span>
                <div class="message-text">${message.text}</div>
                <div class="timestamp">${formatTime(messageDate)} - ${dateString}</div>
            </div>
        </div>
    `;

    messageElement.innerHTML = messageHTML;
    document.getElementById("messages").appendChild(messageElement);
    scrollToBottom();
}

// Function to check if two dates are the same day
function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear();
}

// Function to check if date1 is yesterday compared to date2
function isYesterday(date1, date2) {
    const yesterday = new Date(date2);
    yesterday.setDate(date2.getDate() - 1);
    return isSameDay(date1, yesterday);
}

// Function to format time as HH:MM AM/PM
function formatTime(date) {
    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Function to send a new message
function setupMessageForm() {
    document.getElementById("message-form").addEventListener("submit", function(e) {
        e.preventDefault();
        const messageInput = document.getElementById("message-input");
        const messageText = messageInput.value.trim();
        if (messageText === "") return;
        const timestamp = Date.now();
        db.ref(`rooms/${currentRoom}/messages`).push({
                username,
                text: messageText,
                timestamp
            })
            .then(() => messageInput.value = "")
            .catch(error => console.error("Error sending message:", error));
    });
}

// Function to delete a room
function deleteRoom(room) {
    db.ref(`rooms/${room}`).remove()
        .then(() => {
            console.log(`Room "${room}" deleted successfully.`);
            if (room === currentRoom) {
                currentRoom = "";
                document.getElementById("chat").style.display = "none";
                document.getElementById("no-room-selected").style.display = "block";
            }
        })
        .catch(error => console.error("Error deleting room:", error));
}

// Function to scroll chat to the bottom
function scrollToBottom() {
    const messagesContainer = document.getElementById("messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Handle user logout
logoutBtn.addEventListener("click", function() {
    const authType = localStorage.getItem('authType');
    if (authType === 'google') {
        auth.signOut().then(() => {
            localStorage.removeItem('username');
            localStorage.removeItem('authType');
            window.location.href = 'index.html';
        }).catch(error => {
            console.error("Error signing out:", error);
        });
    } else if (authType === 'guest') {
        localStorage.removeItem('username');
        localStorage.removeItem('authType');
        window.location.href = 'index.html';
    }
});

// Handle user logout
logoutBtnn.addEventListener("click", function() {
    const authType = localStorage.getItem('authType');
    if (authType === 'google') {
        auth.signOut().then(() => {
            localStorage.removeItem('username');
            localStorage.removeItem('authType');
            window.location.href = 'index.html';
        }).catch(error => {
            console.error("Error signing out:", error);
        });
    } else if (authType === 'guest') {
        localStorage.removeItem('username');
        localStorage.removeItem('authType');
        window.location.href = 'index.html';
    }
});

document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});