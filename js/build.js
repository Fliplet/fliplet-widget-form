(function () {
  var forms = {};
  var globalEditModeEnabled = true;

  $('.fl-form').each(function () {
    var connection;
    var $form = $(this);
    var $formHtml = $form.find('.form-html');
    var $formResult = $form.find('.form-result');
    var data = Fliplet.Widget.getData($form.data('form-id'));
    var uuid = $form.data('form-uuid');
    var editModeEnabled = true;
    var dataSourceId;
    var dataSourceEntryId;
    var submitPromiseResolve;
    var submitPromise = new Promise(function(resolve, reject){
      submitPromiseResolve = resolve;
    });

    var formInstance = {
      el: this,
      data: data,
      connection: connection,
      fillForm: fillForm,
      onSubmit: function () {
        return submitPromise;
      },
      onBeforeTinyMCEInit: function () {
        // Resolves immediate, unless onBeforeTinyMCEInit is replaced
        // with another Promise that resolves with an options object
        return Promise.resolve();
      }
    };

    forms[uuid] = formInstance;

    function getConnection() {
      if (!connection) {
        connection = Fliplet.DataSources.connect(data.dataSourceId, { offline: false });
      }

      return connection;
    }

    $form.submit(function (event) {
      event.preventDefault();
      var errors = false;
      $form.find('[required]').each(function () {
        var $el = $(this);
        var name = $el.attr('name');
        var type = $el.attr('type');

        if (type === 'radio' && !$form.find('[name="'+name+'"]:checked').length) {
          errors = true;
          $form.find('[name="'+name+'"]').parents('.radio').addClass('has-error');
          return;
        }

        if (type === 'checkbox' && !$el.is(':checked')) {
          errors = true;
          $form.find('[name="'+name+'"]').parents('.checkbox').addClass('has-error');
          return;
        }

        if ($el.is('[data-tinymce]') && typeof tinyMCE !== 'undefined') {
          var tinymceKey = name;
          if ($el.attr('id')) {
            tinymceKey = $el.attr('id');
          }
          if (tinyMCE.get(tinymceKey) && tinyMCE.get(tinymceKey).getDoc()) {
            if (!tinyMCE.get(tinymceKey).getContent().length) {
              errors = true;
              $el.addClass('has-error');
            }
            return;
          }
        }

        if (!$el.val().length) {
          errors = true;
          $el.addClass('has-error');
          return;
        }
      });

      if (errors) {
        return Fliplet.Navigate.popup({
          popupTitle: 'Required fields',
          popupMessage: 'You need to fill in the required fields'
        });
      }

      Fliplet.Analytics.trackEvent('form', 'submit');

      $formHtml.fadeOut(function () {
        var fields = {};
        var files = {};
        var formData;

        $form.find('[name]').each(function () {
          var $el = $(this);
          var name = $el.attr('name');
          var type = $el.attr('type');

          if (type === 'file') {
            return files[name] = $el[0].files;
          }
          if (type === 'radio') {
            if ($el.is(':checked')) {
              return fields[name] = $el.val();
            }
          }
          if (type === 'checkbox') {
            if (!fields[name]) {
              fields[name] = [];
            }

            if ($el.is(':checked')) {
              return fields[name].push($el.val());
            }
          }
          if ($el.is('[data-tinymce]') && typeof tinyMCE !== 'undefined') {
            var tinymceKey = name;
            if ($el.attr('id')) {
              tinymceKey = $el.attr('id');
            }
            return fields[name] = tinyMCE.get(tinymceKey).getContent();
          }
          fields[name] = $el.val();
        });

        if (typeof formInstance.mapData === 'function') {
          try {
            fields = formInstance.mapData(fields);
          } catch (e) {
            console.error(e);
          }
        }

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

        var options = {};
        if (data.folderId) {
          options.folderId = data.folderId;
        }

        getConnection().then(function (connection) {
          if (typeof formInstance.submit === 'function') {
            return formInstance.submit(formData);
          }

          if (dataSourceEntryId) {
            return connection.update(dataSourceEntryId, formData, options);
          }

          return connection.insert(formData, options);
        }).then(function onSaved() {
          $formResult.fadeIn();
          submitPromiseResolve();
          resetForm();
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

    formInstance.toggleEditMode = function (enabled) {
      editModeEnabled = !!enabled;
      resetForm();
    };

    function resetForm() {
      $form.trigger('reset');
      bindEditMode();
    }

    function fillForm(data) {
      Object.keys(data).forEach(function (key) {
        var value = data[key];
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
            if (type === 'password') {
              // Never fill in password fields
              return;
            }

            if (type === 'radio') {
              return $input.filter('[value="' + value + '"]').prop('checked', true);
            } else if ($input.is('[data-tinymce]') && typeof tinyMCE !== 'undefined') {
              var tinymceKey = key;
              if ($input.attr('id')) {
                tinymceKey = $input.attr('id');
              }
              if (tinyMCE.get(tinymceKey).getDoc()) {
                return tinyMCE.get(tinymceKey).setContent(value);
              }
            }
            $input.val(value);
          }
        }
      });
    }

    function bindEditMode() {
      if (editModeEnabled && Fliplet.Navigate.query.dataSourceId === data.dataSourceId) {
        getConnection().then(function (connection) {
          dataSourceEntryId = parseInt(Fliplet.Navigate.query.dataSourceEntryId);
          return connection.findById(dataSourceEntryId);
        }).then(function (dataSourceEntry) {
          if (!dataSourceEntry) {
            return;
          }

          $form.find('input.fl-data[type="hidden"]').remove();

          fillForm(dataSourceEntry.data);

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

    function initialiseTinyMCE () {
      if ($('textarea[data-tinymce]').length && typeof tinymce !== 'undefined') {
        var tinymcePlugins = [
          'advlist autolink lists link image charmap hr',
          'searchreplace insertdatetime table textcolor colorpicker',
          'autoresize fullscreen code emoticons paste textcolor colorpicker imagetools'
        ];
        var tinymceToolbar = 'undo redo | formatselect | fontsizeselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | blockquote subscript superscript | table charmap hr | forecolor backcolor | removeformat code fullscreen';

        formInstance.onBeforeTinyMCEInit().then(function (opts) {
          // opts @Object Custom TinyMCE options
          opts = opts || {};
          if (opts.hasOwnProperty('plugins')) {
            tinymcePlugins.push(opts.plugins);
          }
          if (opts.hasOwnProperty('toolbar')) {
            tinymceToolbar = tinymceToolbar + ' | ' + opts.toolbar;
          }
          tinymce.init({
            selector: 'textarea[data-tinymce]',
            theme: 'modern',
            plugins: tinymcePlugins.join(' '),
            toolbar: tinymceToolbar,
            image_advtab: true,
            menubar: false,
            statusbar: true,
            inline: false,
            resize: true,
            autoresize_bottom_margin: 50,
            autoresize_max_height: 500,
            autoresize_min_height: 250
          });
        });
      }
    }

    Fliplet.Navigator.onReady().then(function () {
      initialiseTinyMCE();
      if (globalEditModeEnabled) {
        bindEditMode();
      }
    });
  });

  Fliplet.Widget.register('com.fliplet.form', function () {
    return {
      disableAutoBindMode: function () {
        globalEditModeEnabled = false;
      },
      forms: function (uuid) {
        if (uuid) {
          return forms[uuid];
        }

        return Object.keys(forms).map(function (uuid) {
          return forms[uuid];
        });
      }
    };
  });

})();
