(function () {
  var forms = {};

  $('.fl-form').each(function () {
    var connection;
    var $form = $(this);
    var $formHtml = $form.find('.form-html');
    var $formResult = $form.find('.form-result');
    var data = Fliplet.Widget.getData($form.data('form-id'));
    var uuid = $form.data('form-uuid');
    var dataSourceId;
    var dataSourceEntryId;

    var formInstance = {
      el: this,
      data: data
    };

    forms[uuid] = formInstance;

    function getConnection() {
      if (!connection) {
        connection = Fliplet.DataSources.connect(data.dataSourceId);
      }

      return connection;
    }

    $form.submit(function saveForm (event) {
      Fliplet.Analytics.trackEvent('form', 'submit');

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
          } else if ($el.is('[data-tinymce]')) {
            fields[name] = tinyMCE.get(name).getContent();
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
            var value = fields[fieldName];
            if (Array.isArray(value)) {
              value.forEach(function (val) {
                formData.append(fieldName + '[]', val);
              });
            } else {
              formData.append(fieldName, value);
            }
          });
        }

        formData = formData || fields;

        if (typeof formInstance.mapData === 'function') {
          formData = formInstance.mapData(formData);
        }

        var options = {};
        if (data.folderId) {
          options.folderId = data.folderId;
        }

        getConnection().then(function (connection) {
          if (dataSourceEntryId) {
            return connection.update(dataSourceEntryId, formData, options);
          }

          return connection.insert(formData, options);
        }).then(function onSaved() {
          $formResult.fadeIn();
          $form.trigger('reset');
          bindEditMode();
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

    function bindEditMode() {
      if (Fliplet.Navigate.query.dataSourceId === data.dataSourceId) {
        getConnection().then(function (connection) {
          dataSourceEntryId = parseInt(Fliplet.Navigate.query.dataSourceEntryId);
          return connection.findById(dataSourceEntryId);
        }).then(function (dataSourceEntry) {
          $form.find('input.fl-data[type="hidden"]').remove();

          Object.keys(dataSourceEntry.data).forEach(function (key) {
            var value = dataSourceEntry.data[key];
            var $input = $form.find('[name="' + key + '"], [name="' + key + '[]"]');
            var type = $input.attr('type');

            if (Array.isArray(value)) {
              value.forEach(function (val) {
                $input.filter('[value="' + val + '"]')
                  .prop('checked', true)
                  .prop('selected', true);
              });
            } else {
              if (!$input.length || type === 'file') {
                $input = $('<input class="fl-data" type="hidden" name="' + key + '" />');
                $input.val(value);
                $form.prepend($input);
              } else {
                if (type === 'radio') {
                  $input.filter('[value="' + value + '"]').prop('checked', true);
                } else if ($input.is('[data-tinymce]') && tinyMCE.get(key)) {
                  tinyMCE.get(key).setContent(value);
                } else {
                  $input.val(value);
                }
              }
            }
          });

          var $submit = $form.find('[type="submit"]');
          var editLabel = $submit.data('edit-label');
          if (editLabel) {
            $submit.html(editLabel); // button
            $submit.val(editLabel);  // input
          }
        }, function () {
          // Entry not found, or user has got no access to it
          dataSourceEntryId = null;
        });
      }
    }

    tinymce.init({
      selector: 'textarea[data-tinymce]',
      theme: 'modern',
      plugins: [
        'advlist autolink lists link image charmap hr',
        'searchreplace insertdatetime table textcolor colorpicker',
        'autoresize fullscreen code emoticons paste textcolor colorpicker imagetools'
      ],
      toolbar: 'undo redo | formatselect | fontselect fontsizeselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | blockquote subscript superscript | table charmap hr | forecolor backcolor emoticons | removeformat code fullscreen',
      imageadvtab: true,
      menubar: false,
      statusbar: true,
      inline: false,
      resize: true,
      autoresize_bottom_margin: 50,
      autoresize_max_height: 500,
      autoresize_min_height: 250
    });

    bindEditMode();
  });

  Fliplet.Widget.register('com.fliplet.form', function () {
    return {
      forms: function (uuid) {
        return forms[uuid];
      }
    }
  });

})();
