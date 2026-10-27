from django import forms


class SlotForm(forms.Form):
    date = forms.DateField(input_formats=['%Y-%m-%d'])
    start = forms.TimeField(input_formats=['%H:%M'])
    end = forms.TimeField(input_formats=['%H:%M'])


class AvailabilityForm(SlotForm):
    details = forms.CharField(max_length=2000, required=False)


class AssignmentForm(SlotForm):
    user_ref = forms.CharField(max_length=255)
    note = forms.CharField(max_length=2000, required=False)


class WeekForm(forms.Form):
    week = forms.DateField(input_formats=['%Y-%m-%d'])

    def clean_week(self):
        week = self.cleaned_data['week']
        if week.weekday() != 0:
            raise forms.ValidationError('La semaine doit commencer un lundi.')
        return week
