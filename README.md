# Fliplet Form Component

## Instances

You can access form instances

```js
var pageForms = Fliplet.Widget.get('com.fliplet.form').forms(); 
```

## Options

### Map data before sent

```js
var myForm = pageForms[UUID];
myForm.mapData = function(data) {
  // Do whatever to data
  return data;
}
```