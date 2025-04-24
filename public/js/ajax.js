document.getElementById('getAjaxForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = this.elements.name.value;
    
    fetch(`/api/data?name=${encodeURIComponent(name)}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('getResult').innerHTML = `
                <p>Response: ${JSON.stringify(data)}</p>
                <p>Timestamp: ${new Date().toLocaleString()}</p>
            `;
        })
        .catch(error => {
            document.getElementById('getResult').innerHTML = `Error: ${error.message}`;
        });
});

document.getElementById('postAjaxForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = this.elements.name.value;
    
    fetch('/api/data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name })
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('postResult').innerHTML = `
                <p>Response: ${JSON.stringify(data)}</p>
                <p>Timestamp: ${new Date().toLocaleString()}</p>
            `;
        })
        .catch(error => {
            document.getElementById('postResult').innerHTML = `Error: ${error.message}`;
        });
});