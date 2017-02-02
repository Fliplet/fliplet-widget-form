# Fliplet Form Component

## Instances

You can access form instances

```js
var formInstance = Fliplet.Widget.get('com.fliplet.form').forms(UUID);
```

## Dev Options

### Custom submiton send
You can choose not to use our default submit data and create your own.
This MUST return a Promise if you want us to show our default form submission confirmation.

```js
formInstance.submit = function(data) {
  // Do whatever to data
  return Promise.resolve();
}
```

### Post-submission hooks

Whether you are using the default submission process or your own, you can have an event listener for when submissions are successful.

```js
formInstance.onSubmit().then(function(){
  // Submission was a huge success. Celebrate.
});
```
### Map form data before sent

`formData` is a `FormData` type object and has specific `.has()`, `.get()` and `.set()` methods. See https://developer.mozilla.org/en-US/docs/Web/API/FormData

**Note** Because `FormData` support isn't extensive on iOS and Android, we do not recommend using `.mapData()` at this stage unless you are using it to intercept the event right before submission.

```js
formInstance.mapData = function(formData) {
  // formData @FormData
  // See https://developer.mozilla.org/en-US/docs/Web/API/FormData
  return formData;
}
```
