from django import template
register = template.Library()

@register.filter
def replace_underscore(string):
    return string.replace('_', ' ')
