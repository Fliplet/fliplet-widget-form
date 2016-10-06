var data = Fliplet.Widget.getData() || {};

var $dataSource = $('select[name="dataSource"]');

var defaultForm = [
  '<div class="form-group">',
  '   <input type="email" name="email" placeholder="Email address" class="form-control" required/>',
  '</div>',
  '<div class="form-group">',
  '   <input type="submit" value="Submit" class="btn btn-primary" />',
  '</div>'
].join("\r\n");

var defaultResult = [
  '<h2>Thanks for sending the form!</h2>',
  '<hr /><a data-start href="#" class="btn btn-primary">Start over</a>'
].join("\r\n");

var formHtml = CodeMirror(document.getElementById('formHtml'), {
  lineNumbers: true,
  value: data.formHtml || defaultForm,
  mode:  'htmlmixed'
});

var formResult = CodeMirror(document.getElementById('formResult'), {
  lineNumbers: true,
  value: data.formResult || defaultResult,
  mode:  'htmlmixed'
});

$('form').submit(function (event) {
  event.preventDefault();

  Fliplet.Widget.save({
    formHtml: formHtml.getValue(),
    formResult: formResult.getValue(),
    dataSourceId: $dataSource.val()
  }).then(function () {
    Fliplet.Widget.complete();
  });
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  $('form').submit();
});

Fliplet.DataSources.get().then(function (dataSources) {
  dataSources.forEach(function (d) {
    $dataSource.append('<option value="' + d.id + '">' + d.name + '</option>');
  });

  if (data.dataSourceId) {
    $dataSource.val(data.dataSourceId);
  }
});