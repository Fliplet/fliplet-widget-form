# Fliplet Form Component

## Instances

You can access form instances

```js
var formInstance = Fliplet.Widget.get('com.fliplet.form').forms(UUID);
```

## Dev Options

### Map data before sent

```js
formInstance.mapData = function(data) {
  // Do whatever to data
  return data;
}
```

### Custom submiton send
You can choose not to use our default submit data and create your own.
This MUST return a Promise if you want us to show our default form submission confirmation.

```js
formInstance.submit = function(data) {
  // Do whatever to data
  return Promise.resolve();
}
```