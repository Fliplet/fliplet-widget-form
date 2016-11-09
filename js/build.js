$('.fl-form').each(function () {
  var $form = $(this);
  var $formHtml = $form.find('.form-html');
  var $formResult = $form.find('.form-result');
  var data = Fliplet.Widget.getData($form.data('form-id'));

  $form.submit(function (event) {
    event.preventDefault();
    $formHtml.fadeOut(function () {
      var fields = {};
      var files = {};
      var formData;

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
        } else if (type === 'file') {
          files[name] = $el[0].files;
        } else {
          fields[name] = $el.val();
        }
      });

      // Transform to FormData if files were posted
      var fileNames = Object.keys(files);
      if (fileNames.length) {
        if (!Fliplet.Navigator.isOnline()) {
          return alert('You must be connected to submit this form');
        }

        formData = new FormData();

        fileNames.forEach(function (fileName) {
          var fieldFiles = files[fileName];
          var file;

          for (var i = 0; i < fieldFiles.length; i++) {
            file = fieldFiles.item(i);
            formData.append(fileName, file);
          }
        });

        Object.keys(fields).forEach(function (fieldName) {
          formData.append(fieldName, fields[fieldName]);
        });
      }

      Fliplet.DataSources.connect(data.dataSourceId).then(function (connection) {
        return connection.insert(formData || fields);
      }).then(function onSaved() {
        $formResult.fadeIn();
        $form.trigger('reset');
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
