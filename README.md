# Fliplet Form Component

## Instances

You can access form instances

```js
var formInstance = Fliplet.Widget.get('com.fliplet.form').forms(UUID);
```

## Dev Options

### Map form fields before sent

`fields` is an object containing all the fields to be submitted, excluding `type="file"` fields.  

```js
formInstance.mapData = function(fields) {
  // fields @Object
  return fields;
}
```

### Custom submission send
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

### TinyMCE and customisation

Add a `<textarea data-tinymce></textarea>` field with the `data-tinymce` attribute to create a textarea that supports full formatting support.

You can also add new TinyMCE or custom plugins by creating a custom `formInstance.onBeforeTinyMCEInit()` promise. `tinymce` must be added to the page dependency for this to work.

```js
formInstance.onBeforeTinyMCEInit() = function () {
  var opts = {
    plugins: 'mycustomplugin',
    toolbar: 'mycustomplugin'
  };
  return Promise.resolve(opts);
}
```
