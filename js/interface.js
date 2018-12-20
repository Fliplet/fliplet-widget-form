var data = Fliplet.Widget.getData() || {};

var $dataSource = $('select[name="dataSource"]');
var $mediaFolder = $('select[name="mediaFolder"]');
var organizationId = Fliplet.Env.get('organizationId');
var appId = Fliplet.Env.get('appId');

var defaultForm = $('#defaultFormTemplate').html();
var defaultResult = $('#defaultResultTemplate').html();

var formHtml = CodeMirror(document.getElementById('formHtml'), {
  lineNumbers: true,
  value: data.formHtml || defaultForm,
  mode: 'htmlmixed'
});

var formResult = CodeMirror(document.getElementById('formResult'), {
  lineNumbers: true,
  value: data.formResult || defaultResult,
  mode: 'htmlmixed'
});

$('form').submit(function (event) {
  event.preventDefault();

  Fliplet.Widget.save({
    formHtml: formHtml.getValue(),
    formResult: formResult.getValue(),
    dataSourceId: $dataSource.val(),
    folderId: $mediaFolder.val()
  }).then(function () {
    Fliplet.Widget.complete();
  });
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  $('form').submit();
});

Fliplet.DataSources.get({
  organizationId: organizationId,
  appId: appId
}).then(function (dataSources) {
  dataSources.forEach(function (d) {
    $dataSource.append('<option value="' + d.id + '">' + d.name + '</option>');
  });

  if (data.dataSourceId) {
    $dataSource.val(data.dataSourceId);
  }
});

Fliplet.Media.Folders.get({
  organizationId: Fliplet.Env.get('organizationId')
}).then(function (response) {
  response.folders.forEach(function (f) {
    $mediaFolder.append('<option value="' + f.id + '">' + f.name + '</option>');
  });

  if (data.folderId) {
    $mediaFolder.val(data.folderId);
  }
});

$('[data-create-source]').click(function (event) {
  event.preventDefault();
  var name = prompt('Please type a name for your data source:');

  if (!name) {
    return;
  }

  Fliplet.DataSources.create({
    name: name, organizationId:
    organizationId
  }).then(function (d) {
    $dataSource.append('<option value="' + d.id + '">' + d.name + '</option>');
    $dataSource.val(d.id);
  });
});
