document.getElementById('loginBtn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginMessage = document.getElementById('loginMessage');
    loginMessage.textContent = '';

    try {
        const response = await fetch('/api/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('login').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            document.getElementById('userRole').textContent = data.user.role;
        } else {
            loginMessage.textContent = data.message || 'Login failed';
        }
    } catch (error) {
        loginMessage.textContent = 'Error connecting to server';
    }
});

document.getElementById('createShipmentBtn').addEventListener('click', async () => {
    const weight = parseFloat(document.getElementById('weight').value);
    const shippingMethodValue = document.getElementById('shippingMethod').value;
    const shipmentMessage = document.getElementById('shipmentMessage');
    shipmentMessage.textContent = '';

    if (isNaN(weight) || weight <= 0) {
        shipmentMessage.textContent = 'Please enter a valid weight';
        return;
    }

    const shippingMethod = {
        expedited: shippingMethodValue === 'expedited',
        method: shippingMethodValue,
    };

    // Collect from address
    const from = {
        name: document.getElementById('fromName').value,
        street: document.getElementById('fromStreet').value,
        city: document.getElementById('fromCity').value,
        state: document.getElementById('fromState').value,
        zip: document.getElementById('fromZip').value,
        country: document.getElementById('fromCountry').value,
    };

    // Collect to address
    const to = {
        name: document.getElementById('toName').value,
        street: document.getElementById('toStreet').value,
        city: document.getElementById('toCity').value,
        state: document.getElementById('toState').value,
        zip: document.getElementById('toZip').value,
        country: document.getElementById('toCountry').value,
    };

    // Basic validation for addresses
    for (const field in from) {
        if (!from[field]) {
            shipmentMessage.style.color = 'red';
            shipmentMessage.textContent = `Please enter From address ${field}`;
            return;
        }
    }
    for (const field in to) {
        if (!to[field]) {
            shipmentMessage.style.color = 'red';
            shipmentMessage.textContent = `Please enter To address ${field}`;
            return;
        }
    }

    try {
        const response = await fetch('/api/postal/shipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weight, shippingMethod, from, to }),
        });
        const data = await response.json();
        if (data.success) {
            shipmentMessage.style.color = 'green';
            shipmentMessage.textContent = `Shipment created with ID: ${data.shipment.id}, Cost: $${data.shipment.cost}`;
        } else {
            shipmentMessage.style.color = 'red';
            shipmentMessage.textContent = data.message || 'Failed to create shipment';
        }
    } catch (error) {
        shipmentMessage.style.color = 'red';
        shipmentMessage.textContent = 'Error connecting to server';
    }
});

document.getElementById('searchShipmentBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchQuery').value.trim();
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';

    if (!query) {
        searchResults.textContent = 'Please enter a search query';
        return;
    }

    try {
        const response = await fetch(`/api/postal/shipment/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.success) {
            if (data.results.length === 0) {
                searchResults.textContent = 'No shipments found';
            } else {
                const ul = document.createElement('ul');
                data.results.forEach(shipment => {
                    const li = document.createElement('li');
                    li.textContent = `ID: ${shipment.id}, Status: ${shipment.status}, From: ${shipment.from.name}, To: ${shipment.to.name}, Cost: $${shipment.cost}`;
                    ul.appendChild(li);
                });
                searchResults.appendChild(ul);
            }
        } else {
            searchResults.textContent = data.message || 'Search failed';
        }
    } catch (error) {
        searchResults.textContent = 'Error connecting to server';
    }
