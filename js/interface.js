var data = Fliplet.Widget.getData() || {};

var $dataSource = $('select[name="dataSource"]');
var organizationId = Fliplet.Env.get('organizationId');

var defaultForm = [
  '<div class="form-group">',
    '<label for="first-name" class="col-sm-6 control-label">First name</label>',
    '<div class="col-sm-6">',
      '<input type="text" name="first-name" class="form-control" placeholder="">',
    '</div>',
  '</div>',
  '<div class="form-group">',
    '<label for="last-name" class="col-sm-6 control-label">Last name</label>',
    '<div class="col-sm-6">',
      '<input type="text" name="last-name" class="form-control" placeholder="">',
    '</div>',
  '</div>',
  '<div class="form-group">',
    '<label for="nature-inquiry" class="col-sm-6 control-label">Nature of inquiry</label>',
    '<div class="col-sm-6">',
      '<select class="form-control" name="nature-inquiry">',
        '<option>Select one</option>',
        '<option value="Feedback">Feedback</option>',
        '<option value="Support">Support</option>',
      '</select>',
    '</div>',
  '</div>',
  '<div class="form-group">',
    '<label for="email" class="col-sm-6 control-label">Email</label>',
    '<div class="col-sm-6">',
      '<input type="email" name="email" class="form-control" placeholder="">',
    '</div>',
  '</div>',
  '<div class="form-group">',
    '<label for="inquiry1" class="col-sm-6 control-label">Inquiry</label>',
    '<div class="col-sm-6">',
      '<textarea class="form-control" name="inquiry" id="inquiry1" rows="3"></textarea>',
    '</div>',
  '</div>',
  '<div class="form-group">',
    '<div class="col-sm-6 control-label">',
      '<label for="entry_file">Uplaod an attachment</label>',
    '</div>',
    '<div class="col-sm-6">',
      '<label for="file_upload" class="fileUpload btn btn-primary">',
        '<i class="fa fa-plus" aria-hidden="true"></i> Choose a file',
        '<input type="file" id="file_upload" name="Uplaod an attachment" class="input-file selectfile" multiple>',
      '</label>',
      '<span class="text-helper"></span>',
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
    dataSourceId: $dataSource.val()
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
