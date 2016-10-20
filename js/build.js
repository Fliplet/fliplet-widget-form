$('.fl-form').each(function () {
  var $form = $(this);
  var $formHtml = $form.find('.form-html');
  var $formResult = $form.find('.form-result');
  var data = Fliplet.Widget.getData($form.data('form-id'));

  $form.submit(function (event) {
    event.preventDefault();
    $formHtml.fadeOut(function () {
      var fields = {};
      var formData = new FormData();

      $form.find('[name]').each(function () {
        var $el = $(this);
        var fieldName = $el.attr('name');
        if ($el.attr('type') === 'file') {
          formData.append(fieldName, $el[0].files[0]);
        } else {
          formData.append(fieldName, $el.val());
        }
      });

      Fliplet.DataSources.connect(data.dataSourceId).then(function (connection) {
        return connection.insert(formData, {
          multipart: true
        });
      }).then(function onSaved() {
        $formResult.fadeIn();
        $form.trigger("reset");
      }, function onError(error) {
        console.error(error);
      });
    });
  });

  $form.on('click', '[data-start]', function (event) {
    event.preventDefault();
    $formResult.fadeOut(function () {
      $formHtml.fadeIn();
    });
  });
});
