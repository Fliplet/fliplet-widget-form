$('.fl-form').each(function () {
  var $form = $(this);
  var $formHtml = $form.find('.form-html');
  var $formResult = $form.find('.form-result');
  var data = Fliplet.Widget.getData($form.data('form-id'));

  $form.submit(function (event) {
    event.preventDefault();
    $formHtml.fadeOut(function () {
      var fields = {};
      $form.find('[name]').each(function () {
        var $el = $(this);
        fields[$el.attr('name')] = $el.val();
      });

      Fliplet.DataSources.connect(data.dataSourceId).then(function (connection) {
        return connection.insert(fields);
      }).then(function onSaved() {
        $formResult.fadeIn();
      }, function onError(error) {
        console.error(error);
      });
    });
  });

  $form.on('click', '[data-start]', function (event) {
    event.preventDefault();
    $formResult.fadeOut(function () {
      $formHtml.slideDown();
    });
  });
});