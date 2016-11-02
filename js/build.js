$('.fl-form').each(function () {
  var $form = $(this);
  var $formHtml = $form.find('.form-html');
  var $formResult = $form.find('.form-result');
  var data = Fliplet.Widget.getData($form.data('form-id'));

  $form.submit(function (event) {
    Fliplet.Analytics.trackEvent('form', 'submit');

    event.preventDefault();
    $formHtml.fadeOut(function () {
      var fields = {};

      $form.find('[name]').each(function () {
        var $el = $(this);
        var name = $el.attr('name');
        var type = $el.attr('type');

        if (type === 'radio') {
          if ($el.is(':checked')) {
            fields[name] = $el.val();
          }
        } else if (type === 'checkbox') {
          if (!fields[name]) {
            fields[name] = [];
          }

          if ($el.is(':checked')) {
            fields[name].push($el.val());
          }
        } else {
          fields[name] = $el.val();
        }
      });

      Fliplet.DataSources.connect(data.dataSourceId).then(function (connection) {
        return connection.insert(fields);
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

  $form.on('reset', function onResetForm() {
    Fliplet.Analytics.trackEvent('form', 'reset');
  });
});
