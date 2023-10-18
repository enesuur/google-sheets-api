class App {
    constructor(PORT) {
        this.PORT = PORT;
        this._onSubmit = this._onSubmit.bind(this);
        this._onPreview = this._onPreview.bind(this);

        const form = document.querySelector('form');
        form.addEventListener('submit', this._onSubmit);
        form.addEventListener('reset', this._onPreview);
    }

    _onPreview(event) {
        event.preventDefault();

        // Get the form data as an object
        const formData = new FormData(event.target);
        let formdata = Object.fromEntries(formData.entries());

        const message = {
            ...(formdata.name && { name: formdata.name }),
            ...(formdata.email && { email: formdata.email }),
        };

        const fetchOptions = {
            method: formdata.method,
            headers: {
                'Accept': '*/*',
                'Content-Type': 'application/json'
            },
            ...(!['GET', 'DELETE'].includes(formdata.method) && { body: message }),
        };

        const API_END_POINT = `http://localhost:${this.PORT}${formdata.apipath}`
        const fetchPreview = `\nfetch('${API_END_POINT}', ${JSON.stringify(fetchOptions, null, 2)} );`;

        // Render the form data as text
        const previewarea = document.querySelector('.previewarea');
        previewarea.textContent = fetchPreview;
    }

    _onSubmit(event) {
        event.preventDefault();

        // Get the form data as an object
        const formData = new FormData(event.target);
        const formdata = Object.fromEntries(formData.entries());

        const message = {
            ...(formdata.name && { name: formdata.name }),
            ...(formdata.email && { email: formdata.email }),
        };

        const fetchOptions = {
            method: formdata.method,
            headers: {
                'Accept': '*/*',
                'Content-Type': 'application/json'
            },
            ...(!['GET', 'DELETE'].includes(formdata.method) && { body: JSON.stringify(message) }),
        };

        // Render the form data as text
        const previewarea = document.querySelector('.previewarea');
        previewarea.textContent = JSON.stringify(fetchOptions, null, 2);
        
        const API_END_POINT = `http://localhost:${this.PORT}${formdata.apipath}`
        fetch(API_END_POINT, fetchOptions)
            .then(response => response.json())
            .then(data => {
                const responsearea = document.querySelector('.responsearea');
                responsearea.textContent = JSON.stringify(data, null, 2);
            })
            .catch(error => {
                console.error('Error fetching JSON data:', error);
            });
    }

    _onJsonReady(json) {
        return json.data;
    }

    _onResponse(response) {
        return response.json();
    }


}