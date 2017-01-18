# Fliplet Form Component

## Instances

You can access form instances

```js
var pageForms = Fliplet.Widget.get('com.fliplet.form').forms();
var myForm = pageForms[UUID];
```

## Options

### Map data before sent

```js
myForm.mapData = function(data) {
  // Do whatever to data
  return data;
}
```