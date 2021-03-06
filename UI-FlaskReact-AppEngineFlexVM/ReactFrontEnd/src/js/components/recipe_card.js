import React from 'react';
import {
  Button, Card, CardBody, CardTitle, CardText, CardFooter
} from 'reactstrap';

/**
 * RecipeCard
 *
 * props:
 * - recipe (recipe object): recipe object that represents the recipe.
 * - onSelectRecipe (function): callback for when a recipe gets selected.
 * - onSaveRecipe (function): callback for when a recipe gets saved.
 * - onUnsaveRecipe (function): callback for when a recipe gets unsaved.
 */
export class RecipeCard extends React.Component {

    onSelectRecipe = (e) => {
        this.props.onSelectRecipe(e.target.value);
    }

    onSaveRecipe = (e) => {
        this.props.onSaveRecipe(e.target.value);
    }

    onUnsaveRecipe = (e) => {
        this.props.onUnsaveRecipe(e.target.value);
    }

    render() {
        return (
            <Card className="recipe-card">
                <CardBody>
                    <CardTitle>
                        {this.props.recipe.name}
                    </CardTitle>
                    <img src="https://cdn.shopify.com/s/files/1/0156/0137/products/refill_0012_basil.jpg?v=1520501227"/>
                    <h6 className="text-muted">
                        {this.props.recipe.description}
                    </h6>
                </CardBody>
                <CardFooter>
                    <Button
                        value={this.props.recipe.recipe_uuid}
                        onClick={this.onSelectRecipe}
                    >
                        View Recipe
                    </Button>
                    {this.props.recipe.saved ? (
                        <Button
                            value={this.props.recipe.recipe_uuid}
                            onClick={this.onUnsaveRecipe}
                        >
                            Unsave
                        </Button>
                    ) : (
                        <Button
                            value={this.props.recipe.recipe_uuid}
                            onClick={this.onSaveRecipe}
                        >
                            Save
                        </Button>
                    )}
                </CardFooter>
            </Card>
        )
    }

}
