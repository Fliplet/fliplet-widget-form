# Fliplet Form Component

## Instances

You can access form instances

```js
var myForm = Fliplet.Widget.get('com.fliplet.form').forms(UUID);
```

## Dev Options

### Map data before sent

```js
myForm.mapData = function(data) {
  // Do whatever to data
  return data;
}
```