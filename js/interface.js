var data = Fliplet.Widget.getData() || {};

var $dataSource = $('select[name="dataSource"]');
var $mediaFolder = $('select[name="mediaFolder"]');
var organizationId = Fliplet.Env.get('organizationId');

var defaultForm = [
  '<div class="form-group">',
    '<label for="first-name" class="col-sm-12 control-label">First name</label>',
    '<div class="col-sm-12">',
      '<input type="text" name="first-name" class="form-control" placeholder="">',
    '</div>',
  '</div>',
  '<div class="form-group">',
    '<label for="last-name" class="col-sm-12 control-label">Last name</label>',
    '<div class="col-sm-12">',
      '<input type="text" name="last-name" class="form-control" placeholder="">',
    '</div>',
  '</div>',
  '<div class="form-group">',
    '<label for="nature-enquiry" class="col-sm-12 control-label">Nature of enquiry</label>',
    '<div class="col-sm-12">',
      '<select class="form-control" name="nature-enquiry">',
        '<option>Select one</option>',
        '<option value="Feedback">Feedback</option>',
        '<option value="Support">Support</option>',
      '</select>',
    '</div>',
  '</div>',
  '<div class="form-group">',
    '<label for="email" class="col-sm-12 control-label">Email</label>',
    '<div class="col-sm-12">',
      '<input type="email" name="email" class="form-control" placeholder="">',
    '</div>',
  '</div>',
  '<div class="form-group">',
    '<label for="enquiry" class="col-sm-12 control-label">Enquiry</label>',
    '<div class="col-sm-12">',
      '<textarea class="form-control" name="enquiry" id="enquiry" rows="3"></textarea>',
    '</div>',
  '</div>',
  '<hr class="hr-normal">',
  '<div class="form-btns clearfix">',
    '<button type="submit" class="btn btn-primary pull-right" data-edit-label="Update">Submit</button>',
    '<button type="reset" class="btn btn-secondary pull-right">Clear</button>',
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
  organizationId: organizationId
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
